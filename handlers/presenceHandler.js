const { verifyConversationMembership } = require('../services/laravelApi')

module.exports = function presenceHandler(io, socket) {

  socket.on('join_conversation', async ({ conversationId }) => {
    const isMember = await verifyConversationMembership(conversationId, socket.data.userId)
    if (!isMember) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Not a member of this conversation' })
      return
    }

    const room = `conversation:${conversationId}`

    // Store which conversations this socket is in (for disconnect cleanup)
    if (!socket.data.rooms) socket.data.rooms = new Set()
    socket.data.rooms.add(conversationId)

    socket.join(room)
    console.log(`[ROOM] user=${socket.data.userId} joined ${room}`)

    // Tell the other party this user is online
    socket.to(room).emit('user_online', {
      userId: socket.data.userId,
      conversationId,
    })
  })

  socket.on('leave_conversation', ({ conversationId }) => {
    const room = `conversation:${conversationId}`
    socket.leave(room)
    socket.data.rooms?.delete(conversationId)

    socket.to(room).emit('user_offline', {
      userId: socket.data.userId,
      conversationId,
    })
  })

  socket.on('disconnect', () => {
    // Broadcast offline to all rooms this socket was active in
    if (socket.data.rooms) {
      socket.data.rooms.forEach((conversationId) => {
        const room = `conversation:${conversationId}`
        socket.to(room).emit('user_offline', {
          userId: socket.data.userId,
          conversationId,
        })
      })
    }
  })
}
