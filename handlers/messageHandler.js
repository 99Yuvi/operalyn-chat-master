const { persistMessage, getConversationMembers } = require('../services/laravelApi')

module.exports = function messageHandler(io, socket) {

  socket.on('send_message', async ({ conversationId, body, tempId, type, file_path, file_name, file_size }) => {
    const isFileMsg = type && type !== 'text'

    // Guard: text messages need body, file messages need file_path
    if (!isFileMsg && (!body || !body.trim())) return
    if (isFileMsg && !file_path) return

    try {
      // 1. Persist to Laravel first (source of truth)
      const message = await persistMessage(conversationId, socket.data.userId, {
        body:      isFileMsg ? null : body.trim(),
        type:      type || 'text',
        file_path: file_path  || null,
        file_name: file_name  || null,
        file_size: file_size  || null,
      })

      // 2. Broadcast persisted message to ALL members of the room (including sender)
      //    Client uses tempId to replace its optimistic message with the real one
      io.to(`conversation:${conversationId}`).emit('new_message', {
        ...message,
        tempId,
      })

      // 3. User-level notification for the recipient — reaches them even when
      //    they're on another page (not joined to this conversation room).
      //    The frontend ignores it if the conversation is already open & visible.
      try {
        const { client_id, freelancer_id } = await getConversationMembers(conversationId)
        const recipientId = socket.data.userId === client_id ? freelancer_id : client_id
        if (recipientId) {
          io.to(`user:${recipientId}`).emit('message_notification', message)
        }
      } catch (notifyErr) {
        console.error('[NOTIFY] Failed:', notifyErr.message)
      }

    } catch (err) {
      console.error('[MESSAGE] Persist failed:', err.message)
      // Notify only the sender so they can retry
      socket.emit('message_error', {
        code:    'PERSIST_FAILED',
        message: 'Message not sent. Please try again.',
        tempId,
      })
    }
  })

  socket.on('messages_read', async ({ conversationId }) => {
    // Relay read receipt to other party
    socket.to(`conversation:${conversationId}`).emit('read_receipt', {
      conversationId,
      userId: socket.data.userId,
      readAt: new Date().toISOString(),
    })
  })
}
