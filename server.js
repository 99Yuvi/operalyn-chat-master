require('dotenv').config()

if (!process.env.NODE_SERVICE_TOKEN) {
  console.error('[FATAL] NODE_SERVICE_TOKEN is not set. Exiting.')
  process.exit(1)
}
if (!process.env.LARAVEL_API_URL) {
  console.error('[FATAL] LARAVEL_API_URL is not set. Exiting.')
  process.exit(1)
}

const { createServer } = require('http')
const { Server }       = require('socket.io')

const authMiddleware    = require('./middleware/auth')
const messageHandler   = require('./handlers/messageHandler')
const presenceHandler  = require('./handlers/presenceHandler')
const typingHandler    = require('./handlers/typingHandler')

const PORT = process.env.PORT || 3001

// Support comma-separated origins: "https://operalyn.com,http://localhost:5173"
const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5173'
const CORS_ORIGIN = rawOrigins.split(',').map(o => o.trim())

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin:      CORS_ORIGIN,
    methods:     ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

// Auth middleware — validates Sanctum token before connection completes
io.use(authMiddleware)

io.on('connection', (socket) => {
  console.log(`[CONNECT] user=${socket.data.userId} socket=${socket.id}`)

  // User-level room — lets the server notify this user about new messages
  // even when they are not inside the conversation room (other page open)
  socket.join(`user:${socket.data.userId}`)

  messageHandler(io, socket)
  presenceHandler(io, socket)
  typingHandler(io, socket)

  socket.on('disconnect', (reason) => {
    console.log(`[DISCONNECT] user=${socket.data.userId} reason=${reason}`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Operalyn chat server running on port ${PORT}`)
})
