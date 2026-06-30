const axios = require('axios')

const client = axios.create({
  baseURL: process.env.LARAVEL_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    Authorization: `Bearer ${process.env.NODE_SERVICE_TOKEN}`,
    Accept:        'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

/** Verify a Sanctum token and return { user_id, role, name } */
async function verifyToken(token) {
  const res = await axios.get(
    `${process.env.LARAVEL_API_URL || 'http://localhost:8000/api/v1'}/auth/socket-verify`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
  )
  return res.data
}

/** Persist a text message to the database */
async function persistMessage(conversationId, senderId, body, type = 'text') {
  const res = await client.post('/internal/messages', {
    conversation_id: conversationId,
    sender_id:       senderId,
    body,
    type,
  })
  return res.data.data
}

module.exports = { verifyToken, persistMessage }
