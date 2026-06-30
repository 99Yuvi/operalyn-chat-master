module.exports = function presenceHandler(io, socket) {

  socket.on('join_conversation', ({ conversationId }) => {
    const room = `conversation:${conversationId}`

    // Store which conversations this socket is in (for disconnect cleanup)
    if (!socket.data.rooms) socket.data.rooms = new Set()
    socket.data.rooms.add(room)

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
    socket.data.rooms?.delete(room)

    socket.to(room).emit('user_offline', {
      userId: socket.data.userId,
      conversationId,
    })
  })

  socket.on('disconnect', () => {
    // Broadcast offline to all rooms this socket was active in
    if (socket.data.rooms) {
      socket.data.rooms.forEach((room) => {
        const conversationId = room.replace('conversation:', '')
        socket.to(room).emit('user_offline', {
          userId: socket.data.userId,
          conversationId,
        })
      })
    }
  })
}
