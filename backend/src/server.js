// src/server.js
require('dotenv').config()
const http = require('http')
const app  = require('./app')
const { initDB }        = require('./config/database')
const { initWebSocket } = require('./config/websocket')

const PORT = process.env.PORT || 4000

async function start() {
  try {
    await initDB()
    console.log('✅ PostgreSQL connected')

    const server = http.createServer(app)
    initWebSocket(server)

    server.listen(PORT, () => {
      console.log(`Flowspace API running on http://localhost:${PORT}`)
      console.log(`WebSocket server ready`)
    })

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received — shutting down')
      server.close(() => process.exit(0))
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
