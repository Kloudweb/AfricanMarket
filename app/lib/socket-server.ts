
import { Server, Socket } from 'socket.io'
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { prisma } from '@/lib/db'
import { getToken } from 'next-auth/jwt'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

interface SocketUser {
  id: string
  name: string
  avatar?: string
  role?: string
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser
  userId?: string
}

let io: Server

export const initializeSocketServer = async () => {
  await app.prepare()
  
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  })

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'))
      }

      // Verify JWT token
      const decoded = await getToken({ 
        req: { headers: { authorization: `Bearer ${token}` } } as any,
        secret: process.env.NEXTAUTH_SECRET 
      })

      if (!decoded) {
        return next(new Error('Authentication error: Invalid token'))
      }

      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, name: true, avatar: true, role: true }
      })

      if (!user) {
        return next(new Error('Authentication error: User not found'))
      }

      socket.user = {
        ...user,
        name: user.name || 'Anonymous',
        avatar: user.avatar || undefined
      }
      socket.userId = user.id
      next()
    } catch (error) {
      console.error('Socket authentication error:', error)
      next(new Error('Authentication error'))
    }
  })

  // Connection handling
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.user?.name} connected (${socket.userId})`)

    // Join user to their personal room
    socket.join(`user:${socket.userId}`)

    // Handle ride room joining
    socket.on('join_ride', async (rideId: string) => {
      try {
        // Verify user has access to this ride
        const ride = await prisma.ride.findFirst({
          where: {
            id: rideId,
            OR: [
              { customerId: socket.userId },
              { driver: { userId: socket.userId } }
            ]
          }
        })

        if (ride) {
          socket.join(`ride:${rideId}`)
          socket.emit('ride_joined', { rideId, success: true })
          
          // Notify other users in the ride
          socket.to(`ride:${rideId}`).emit('user_joined_ride', {
            userId: socket.userId,
            userName: socket.user?.name,
            timestamp: new Date()
          })
        } else {
          socket.emit('ride_joined', { rideId, success: false, error: 'Access denied' })
        }
      } catch (error) {
        console.error('Error joining ride:', error)
        socket.emit('ride_joined', { rideId, success: false, error: 'Server error' })
      }
    })

    // Handle leaving ride room
    socket.on('leave_ride', (rideId: string) => {
      socket.leave(`ride:${rideId}`)
      socket.to(`ride:${rideId}`).emit('user_left_ride', {
        userId: socket.userId,
        userName: socket.user?.name,
        timestamp: new Date()
      })
    })

    // Handle chat messages
    socket.on('send_message', async (data: {
      rideId: string
      content: string
      type: 'text' | 'image' | 'location' | 'voice'
      metadata?: any
    }) => {
      try {
        // Verify user has access to this ride
        const ride = await prisma.ride.findFirst({
          where: {
            id: data.rideId,
            OR: [
              { customerId: socket.userId },
              { driver: { userId: socket.userId } }
            ]
          }
        })

        if (!ride) {
          socket.emit('message_error', { error: 'Access denied' })
          return
        }

        // Determine receiver based on sender
        const receiverId = socket.userId === ride.customerId ? ride.driverId : ride.customerId

        // Save message to database
        const message = await prisma.chatMessage.create({
          data: {
            rideId: data.rideId,
            senderId: socket.userId!,
            receiverId: receiverId || '',
            message: data.content,
          },
          include: {
            sender: {
              select: { id: true, name: true, avatar: true }
            }
          }
        })

        // Broadcast to all users in the ride
        io.to(`ride:${data.rideId}`).emit('new_message', {
          id: message.id,
          content: message.message,
          messageType: data.type, // Use original data since it's not stored in DB
          metadata: data.metadata || {}, // Use original data since it's not stored in DB
          sender: message.sender,
          timestamp: message.createdAt,
          rideId: data.rideId
        })

      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('message_error', { error: 'Failed to send message' })
      }
    })

    // Handle typing indicators
    socket.on('typing_start', (data: { rideId: string }) => {
      socket.to(`ride:${data.rideId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user?.name,
        isTyping: true
      })
    })

    socket.on('typing_stop', (data: { rideId: string }) => {
      socket.to(`ride:${data.rideId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user?.name,
        isTyping: false
      })
    })

    // Handle location updates
    socket.on('location_update', async (data: {
      rideId: string
      latitude: number
      longitude: number
      speed?: number
      heading?: number
    }) => {
      try {
        // Verify user is driver for this ride
        const ride = await prisma.ride.findFirst({
          where: {
            id: data.rideId,
            driver: { userId: socket.userId }
          }
        })

        if (!ride) {
          socket.emit('location_error', { error: 'Access denied' })
          return
        }

        // Update driver location
        await prisma.driver.update({
          where: { userId: socket.userId },
          data: {
            currentLatitude: data.latitude,
            currentLongitude: data.longitude
          }
        })

        // Get driver ID for the user
        const driver = await prisma.driver.findUnique({
          where: { userId: socket.userId },
          select: { id: true }
        })

        if (driver) {
          // Save tracking data
          await prisma.tripTracking.create({
            data: {
              rideId: data.rideId,
              driverId: driver.id,
              latitude: data.latitude,
              longitude: data.longitude,
              speed: data.speed,
              heading: data.heading,
              tripStatus: 'IN_PROGRESS',
              timestamp: new Date()
            }
          })
        }

        // Broadcast location to ride participants
        socket.to(`ride:${data.rideId}`).emit('location_update', {
          rideId: data.rideId,
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed,
          heading: data.heading,
          timestamp: new Date()
        })

      } catch (error) {
        console.error('Error updating location:', error)
        socket.emit('location_error', { error: 'Failed to update location' })
      }
    })

    // Handle safety alerts
    socket.on('safety_alert', async (data: {
      rideId: string
      alertType: string
      severity: string
      description?: string
      location?: any
    }) => {
      try {
        // Create safety alert
        const alert = await prisma.safetyAlert.create({
          data: {
            rideId: data.rideId,
            triggeredBy: socket.userId!,
            alertType: data.alertType as any, // Cast to SafetyAlertType enum
            severity: data.severity,
            message: data.description,
            location: data.location || {}
          }
        })

        // Broadcast to all users in the ride
        io.to(`ride:${data.rideId}`).emit('safety_alert', {
          id: alert.id,
          alertType: alert.alertType,
          severity: alert.severity,
          description: alert.message,
          location: alert.location,
          triggeredBy: socket.userId,
          triggeredByName: socket.user?.name,
          timestamp: alert.createdAt
        })

        // Notify emergency services if critical
        if (data.severity === 'CRITICAL') {
          // TODO: Implement emergency service notification
          console.log('CRITICAL ALERT: Emergency services should be notified')
        }

      } catch (error) {
        console.error('Error handling safety alert:', error)
        socket.emit('safety_alert_error', { error: 'Failed to process safety alert' })
      }
    })

    // Handle call events
    socket.on('call_initiate', async (data: {
      rideId: string
      calleeId: string
      callType: 'voice' | 'video'
    }) => {
      try {
        // Create call record
        const call = await prisma.rideCall.create({
          data: {
            rideId: data.rideId,
            callerId: socket.userId!,
            calleeId: data.calleeId,
            callType: data.callType.toUpperCase() as any, // Convert to uppercase enum
            status: 'INITIATED'
          }
        })

        // Notify callee
        io.to(`user:${data.calleeId}`).emit('incoming_call', {
          id: call.id,
          callerId: socket.userId,
          callerName: socket.user?.name,
          callerAvatar: socket.user?.avatar,
          callType: data.callType,
          rideId: data.rideId
        })

        socket.emit('call_initiated', { callId: call.id })

      } catch (error) {
        console.error('Error initiating call:', error)
        socket.emit('call_error', { error: 'Failed to initiate call' })
      }
    })

    socket.on('call_answer', async (data: { callId: string }) => {
      try {
        await prisma.rideCall.update({
          where: { id: data.callId },
          data: { status: 'ANSWERED', answeredAt: new Date() }
        })

        const call = await prisma.rideCall.findUnique({
          where: { id: data.callId },
          include: { caller: true, callee: true }
        })

        if (call) {
          io.to(`user:${call.callerId}`).emit('call_answered', {
            callId: data.callId,
            answeredBy: socket.userId,
            answeredByName: socket.user?.name
          })
        }

      } catch (error) {
        console.error('Error answering call:', error)
      }
    })

    socket.on('call_end', async (data: { callId: string }) => {
      try {
        await prisma.rideCall.update({
          where: { id: data.callId },
          data: { status: 'ENDED', endedAt: new Date() }
        })

        const call = await prisma.rideCall.findUnique({
          where: { id: data.callId },
          include: { caller: true, callee: true }
        })

        if (call) {
          // Notify both parties
          io.to(`user:${call.callerId}`).emit('call_ended', { callId: data.callId })
          io.to(`user:${call.calleeId}`).emit('call_ended', { callId: data.callId })
        }

      } catch (error) {
        console.error('Error ending call:', error)
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user?.name} disconnected (${socket.userId})`)
    })

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
  })

  return { server, io }
}

export const getSocketServer = () => io

export { io }
