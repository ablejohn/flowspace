// src/config/websocket.js
// Real-time engine — one room per workspace
// When a task is updated, ALL connected members of that workspace
// receive the update instantly without polling.

const { WebSocketServer } = require('ws')
const { verifyToken }     = require('./jwt')

// Map: workspaceId → Set of WebSocket clients
const rooms = new Map()

function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    // Extract token from query string: /ws?token=xxx&workspaceId=yyy
    const url         = new URL(req.url, 'http://localhost')
    const token       = url.searchParams.get('token')
    const workspaceId = url.searchParams.get('workspaceId')

    // Authenticate the connection
    const payload = verifyToken(token)
    if (!payload || !workspaceId) {
      ws.close(1008, 'Unauthorized')
      return
    }

    ws.userId      = payload.userId
    ws.fullName    = payload.fullName
    ws.workspaceId = workspaceId

    // Join room
    if (!rooms.has(workspaceId)) rooms.set(workspaceId, new Set())
    rooms.get(workspaceId).add(ws)

    console.log(`👤 ${ws.fullName} joined workspace ${workspaceId} (${rooms.get(workspaceId).size} online)`)

    // Notify others in the room
    broadcast(workspaceId, {
      type: 'USER_JOINED',
      payload: { userId: ws.userId, fullName: ws.fullName }
    }, ws)

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw)
        handleMessage(ws, msg)
      } catch (e) {
        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid message format' } }))
      }
    })

    ws.on('close', () => {
      leaveRoom(ws)
    })

    ws.on('error', () => {
      leaveRoom(ws)
    })

    // Confirm connection
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      payload: { workspaceId, userId: ws.userId, message: 'Connected to Flowspace' }
    }))
  })

  console.log(' WebSocket server initialised')
  return wss
}

function handleMessage(ws, msg) {
  const { type, payload } = msg

  switch (type) {
    // Client sends this when they start editing a task — shows others who is editing
    case 'TASK_EDITING':
      broadcast(ws.workspaceId, {
        type: 'TASK_EDITING',
        payload: { taskId: payload.taskId, userId: ws.userId, fullName: ws.fullName }
      }, ws)
      break

    // Ping / keep-alive
    case 'PING':
      ws.send(JSON.stringify({ type: 'PONG' }))
      break

    default:
      break
  }
}

// Broadcast to all clients in a workspace room except the sender
function broadcast(workspaceId, message, excludeWs = null) {
  const room = rooms.get(workspaceId)
  if (!room) return

  const data = JSON.stringify(message)
  room.forEach(client => {
    if (client !== excludeWs && client.readyState === 1) {
      client.send(data)
    }
  })
}

// Broadcast to ALL including sender (used by HTTP routes after DB writes)
function broadcastToWorkspace(workspaceId, message) {
  broadcast(workspaceId, message, null)
}

function leaveRoom(ws) {
  const room = rooms.get(ws.workspaceId)
  if (room) {
    room.delete(ws)
    if (room.size === 0) rooms.delete(ws.workspaceId)
    else {
      broadcast(ws.workspaceId, {
        type: 'USER_LEFT',
        payload: { userId: ws.userId, fullName: ws.fullName }
      })
    }
  }
  console.log(`👋 ${ws.fullName} left workspace ${ws.workspaceId}`)
}

// Get online users in a workspace
function getOnlineUsers(workspaceId) {
  const room = rooms.get(workspaceId)
  if (!room) return []
  return [...room].map(ws => ({ userId: ws.userId, fullName: ws.fullName }))
}

module.exports = { initWebSocket, broadcastToWorkspace, getOnlineUsers }
