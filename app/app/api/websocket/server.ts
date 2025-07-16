
// WebSocket server setup
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { webSocketService } from '@/lib/comprehensive-websocket-service'

const httpServer = createServer()
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
})

// Initialize WebSocket service
webSocketService.setSocketServer(io)

const PORT = process.env.WS_PORT || 8001

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  await webSocketService.shutdown()
  httpServer.close(() => {
    process.exit(0)
  })
})

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...')
  await webSocketService.shutdown()
  httpServer.close(() => {
    process.exit(0)
  })
})

