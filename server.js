require('dotenv').config()

const { createServer } = require('http')
const { Server }       = require('socket.io')

const authMiddleware    = require('./middleware/auth')
const messageHandler   = require('./handlers/messageHandler')
const presenceHandler  = require('./handlers/presenceHandler')
const typingHandler    = require('./handlers/typingHandler')

const PORT        = process.env.PORT || 3001
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'

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
