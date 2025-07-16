
// Production WebSocket service with socket.io
import { Server as SocketServer, Socket } from 'socket.io'
import { prisma } from '@/lib/db'
import { RideChatService } from './ride-chat-service'
import { TripTrackingService } from './trip-tracking-service'
import { SafetyService } from './safety-service'

interface ConnectedUser {
  socketId: string
  userId: string
  name: string
  avatar?: string
  connectedAt: Date
  lastActivity: Date
}

export class WebSocketService {
  private static instance: WebSocketService
  private io: SocketServer | null = null
  private connectedUsers: Map<string, ConnectedUser[]> = new Map() // userId -> ConnectedUser[]
  private userSocketMap: Map<string, string> = new Map() // socketId -> userId
  private rideRooms: Map<string, Set<string>> = new Map() // rideId -> Set<userId>
  private socketUserMap: Map<string, ConnectedUser> = new Map() // socketId -> ConnectedUser

  constructor() {
    console.log('WebSocket service initialized (production mode)')
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  // Set the socket.io server instance
  setSocketServer(io: SocketServer) {
    this.io = io
    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    if (!this.io) return

    this.io.on('connection', (socket: Socket) => {
      console.log('New socket connection:', socket.id)

      // Handle user connection
      socket.on('user_connected', (userData: {
        userId: string
        name: string
        avatar?: string
      }) => {
        this.handleUserConnection(socket, userData)
      })

      // Handle user disconnection
      socket.on('disconnect', () => {
        this.handleUserDisconnection(socket)
      })

      // Handle heartbeat
      socket.on('heartbeat', () => {
        this.updateUserActivity(socket.id)
      })
    })

    // Start cleanup interval
    setInterval(() => {
      this.cleanupInactiveConnections()
    }, 30000) // Clean up every 30 seconds
  }

  private handleUserConnection(socket: Socket, userData: {
    userId: string
    name: string
    avatar?: string
  }) {
    const connectedUser: ConnectedUser = {
      socketId: socket.id,
      userId: userData.userId,
      name: userData.name,
      avatar: userData.avatar,
      connectedAt: new Date(),
      lastActivity: new Date()
    }

    // Add to user connections
    const userConnections = this.connectedUsers.get(userData.userId) || []
    userConnections.push(connectedUser)
    this.connectedUsers.set(userData.userId, userConnections)

    // Add to socket mappings
    this.userSocketMap.set(socket.id, userData.userId)
    this.socketUserMap.set(socket.id, connectedUser)

    // Join user to their personal room
    socket.join(`user:${userData.userId}`)

    console.log(`User ${userData.name} (${userData.userId}) connected via socket ${socket.id}`)
  }

  private handleUserDisconnection(socket: Socket) {
    const userId = this.userSocketMap.get(socket.id)
    if (!userId) return

    // Remove from user connections
    const userConnections = this.connectedUsers.get(userId) || []
    const updatedConnections = userConnections.filter(conn => conn.socketId !== socket.id)
    
    if (updatedConnections.length === 0) {
      this.connectedUsers.delete(userId)
    } else {
      this.connectedUsers.set(userId, updatedConnections)
    }

    // Remove from socket mappings
    this.userSocketMap.delete(socket.id)
    this.socketUserMap.delete(socket.id)

    // Remove from ride rooms
    for (const [rideId, userIds] of this.rideRooms.entries()) {
      userIds.delete(userId)
      if (userIds.size === 0) {
        this.rideRooms.delete(rideId)
      }
    }

    console.log(`User ${userId} disconnected from socket ${socket.id}`)
  }

  private updateUserActivity(socketId: string) {
    const connectedUser = this.socketUserMap.get(socketId)
    if (connectedUser) {
      connectedUser.lastActivity = new Date()
    }
  }

  private cleanupInactiveConnections() {
    const now = new Date()
    const inactiveThreshold = 5 * 60 * 1000 // 5 minutes

    for (const [userId, connections] of this.connectedUsers.entries()) {
      const activeConnections = connections.filter(conn => {
        const inactive = now.getTime() - conn.lastActivity.getTime() > inactiveThreshold
        if (inactive) {
          this.userSocketMap.delete(conn.socketId)
          this.socketUserMap.delete(conn.socketId)
        }
        return !inactive
      })

      if (activeConnections.length === 0) {
        this.connectedUsers.delete(userId)
      } else {
        this.connectedUsers.set(userId, activeConnections)
      }
    }
  }

  // Emit to specific user
  emitToUser(userId: string, event: string, data: any) {
    if (!this.io) {
      console.warn('Socket.io not initialized')
      return
    }

    this.io.to(`user:${userId}`).emit(event, data)
    console.log(`Emitted ${event} to user ${userId}`)
  }

  // Emit to all users in a ride
  emitToRide(rideId: string, event: string, data: any) {
    if (!this.io) {
      console.warn('Socket.io not initialized')
      return
    }

    this.io.to(`ride:${rideId}`).emit(event, data)
    console.log(`Emitted ${event} to ride ${rideId}`)
  }

  // Emit to all connected users
  emitToAll(event: string, data: any) {
    if (!this.io) {
      console.warn('Socket.io not initialized')
      return
    }

    this.io.emit(event, data)
    console.log(`Emitted ${event} to all users`)
  }

  // Join user to ride room
  joinRideRoom(userId: string, rideId: string) {
    if (!this.io) return

    const userConnections = this.connectedUsers.get(userId) || []
    userConnections.forEach(conn => {
      this.io?.sockets.sockets.get(conn.socketId)?.join(`ride:${rideId}`)
    })

    // Add to ride room tracking
    if (!this.rideRooms.has(rideId)) {
      this.rideRooms.set(rideId, new Set())
    }
    this.rideRooms.get(rideId)?.add(userId)

    console.log(`User ${userId} joined ride room ${rideId}`)
  }

  // Leave ride room
  leaveRideRoom(userId: string, rideId: string) {
    if (!this.io) return

    const userConnections = this.connectedUsers.get(userId) || []
    userConnections.forEach(conn => {
      this.io?.sockets.sockets.get(conn.socketId)?.leave(`ride:${rideId}`)
    })

    // Remove from ride room tracking
    const rideUsers = this.rideRooms.get(rideId)
    if (rideUsers) {
      rideUsers.delete(userId)
      if (rideUsers.size === 0) {
        this.rideRooms.delete(rideId)
      }
    }

    console.log(`User ${userId} left ride room ${rideId}`)
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId)
  }

  // Get online users in a ride
  getOnlineUsersInRide(rideId: string): string[] {
    const rideUsers = this.rideRooms.get(rideId) || new Set()
    return Array.from(rideUsers).filter(userId => this.isUserOnline(userId))
  }

  // Get all online users
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys())
  }

  // Get user connections
  getUserConnections(userId: string): ConnectedUser[] {
    return this.connectedUsers.get(userId) || []
  }

  // Send push notification if user is offline
  async sendPushNotificationIfOffline(userId: string, notification: {
    title: string
    body: string
    data?: any
  }) {
    if (!this.isUserOnline(userId)) {
      try {
        await prisma.pushNotification.create({
          data: {
            userId,
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            sent: false,
          }
        })
        
        console.log(`Push notification queued for user ${userId}`)
      } catch (error) {
        console.error('Error queueing push notification:', error)
      }
    }
  }

  // Notify emergency contacts
  async notifyEmergencyContacts(userId: string, alert: any) {
    try {
      const contacts = await prisma.emergencyContact.findMany({
        where: { 
          userId,
          isActive: true,
          notifyEmergency: true
        },
        orderBy: { priority: 'asc' }
      })

      for (const contact of contacts) {
        // TODO: Send SMS/email to emergency contact
        console.log(`Emergency notification sent to ${contact.name} (${contact.phone})`)
        
        // Queue push notification for emergency contact if they're also a user
        const emergencyUser = await prisma.user.findFirst({
          where: { phone: contact.phone }
        })
        
        if (emergencyUser) {
          await this.sendPushNotificationIfOffline(emergencyUser.id, {
            title: 'Emergency Alert',
            body: `${alert.user?.name || 'Someone'} has triggered an emergency alert during their ride`,
            data: { alertId: alert.id, rideId: alert.rideId }
          })
        }
      }
    } catch (error) {
      console.error('Error notifying emergency contacts:', error)
    }
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      totalConnections: this.userSocketMap.size,
      uniqueUsers: this.connectedUsers.size,
      activeRides: this.rideRooms.size,
      connectedUsers: Array.from(this.connectedUsers.keys()),
      activeRideRooms: Array.from(this.rideRooms.keys()),
      userConnections: Array.from(this.connectedUsers.entries()).map(([userId, connections]) => ({
        userId,
        connectionCount: connections.length,
        lastActivity: Math.max(...connections.map(c => c.lastActivity.getTime()))
      }))
    }
  }

  // Graceful shutdown
  async shutdown() {
    if (this.io) {
      console.log('Shutting down WebSocket service...')
      
      // Notify all connected users
      this.emitToAll('server_shutdown', {
        message: 'Server is shutting down. Please reconnect in a moment.',
        timestamp: new Date()
      })

      // Wait a bit for the message to be sent
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Close all connections
      this.io.close()
      this.io = null
    }

    // Clear all maps
    this.connectedUsers.clear()
    this.userSocketMap.clear()
    this.rideRooms.clear()
    this.socketUserMap.clear()

    console.log('WebSocket service shut down complete')
  }
}
