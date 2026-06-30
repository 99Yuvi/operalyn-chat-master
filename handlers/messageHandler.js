const { persistMessage } = require('../services/laravelApi')

module.exports = function messageHandler(io, socket) {

  socket.on('send_message', async ({ conversationId, body, tempId }) => {
    if (!body || !body.trim()) return

    try {
      // 1. Persist to Laravel first (source of truth)
      const message = await persistMessage(conversationId, socket.data.userId, body.trim())

      // 2. Broadcast persisted message to ALL members of the room (including sender)
      //    Client uses tempId to replace its optimistic message with the real one
      io.to(`conversation:${conversationId}`).emit('new_message', {
        ...message,
        tempId,
      })

    } catch (err) {
      console.error('[MESSAGE] Persist failed:', err.message)
      // Notify only the sender so they can retry
      socket.emit('error', {
        code:   'PERSIST_FAILED',
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
