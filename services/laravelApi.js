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
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, timeout: 10000 }
  )
  return res.data
}

/** Persist a message (text or file) to the database */
async function persistMessage(conversationId, senderId, { body, type = 'text', file_path, file_name, file_size }) {
  const payload = { conversation_id: conversationId, sender_id: senderId, body, type }
  if (file_path) { payload.file_path = file_path; payload.file_name = file_name; payload.file_size = file_size }
  const res = await client.post('/internal/messages', payload)
  return res.data.data
}

/** Get the two members of a conversation: { client_id, freelancer_id } */
async function getConversationMembers(conversationId) {
  const res = await client.get(`/internal/conversations/${conversationId}/members`)
  return res.data
}

/** Verify that a user is a member (client or freelancer) of a conversation */
async function verifyConversationMembership(conversationId, userId) {
  try {
    const { client_id, freelancer_id } = await getConversationMembers(conversationId)
    return userId === client_id || userId === freelancer_id
  } catch {
    return false
  }
}

module.exports = { verifyToken, persistMessage, verifyConversationMembership, getConversationMembers }
