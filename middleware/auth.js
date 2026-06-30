const { verifyToken } = require('../services/laravelApi')

module.exports = async function authMiddleware(socket, next) {
  const token = socket.handshake.auth?.token

  if (!token) {
    return next(new Error('Missing auth token'))
  }

  try {
    const { user_id, role, name } = await verifyToken(token)
    socket.data.userId = user_id
    socket.data.role   = role
    socket.data.name   = name
    socket.data.token  = token
    next()
  } catch (err) {
    console.error('[AUTH] Token verification failed:', err.message)
    next(new Error('Unauthorized'))
  }
}
