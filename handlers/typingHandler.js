// Map: "userId:conversationId" → timer handle
const typingTimers = new Map()

module.exports = function typingHandler(io, socket) {

  socket.on('typing_start', ({ conversationId }) => {
    const key  = `${socket.data.userId}:${conversationId}`
    const room = `conversation:${conversationId}`

    // Relay to others in the room (not the sender)
    socket.to(room).emit('user_typing', {
      userId: socket.data.userId,
      conversationId,
    })

    // Auto-stop after 3s of no further typing_start events
    if (typingTimers.has(key)) clearTimeout(typingTimers.get(key))
    typingTimers.set(key, setTimeout(() => {
      socket.to(room).emit('user_stopped_typing', {
        userId: socket.data.userId,
        conversationId,
      })
      typingTimers.delete(key)
    }, 3000))
  })

  socket.on('typing_stop', ({ conversationId }) => {
    const key  = `${socket.data.userId}:${conversationId}`
    const room = `conversation:${conversationId}`

    if (typingTimers.has(key)) {
      clearTimeout(typingTimers.get(key))
      typingTimers.delete(key)
    }

    socket.to(room).emit('user_stopped_typing', {
      userId: socket.data.userId,
      conversationId,
    })
  })

  // Clean up timers on disconnect
  socket.on('disconnect', () => {
    if (socket.data.rooms) {
      socket.data.rooms.forEach((room) => {
        const conversationId = room.replace('conversation:', '')
        const key = `${socket.data.userId}:${conversationId}`
        if (typingTimers.has(key)) {
          clearTimeout(typingTimers.get(key))
          typingTimers.delete(key)
        }
      })
    }
  })
}
