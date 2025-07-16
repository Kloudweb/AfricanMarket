
'use client'

import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'

interface SocketClientOptions {
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

interface SocketEvent {
  event: string
  handler: (data: any) => void
}

class SocketClient {
  private socket: Socket | null = null
  private isConnected: boolean = false
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map()
  private options: SocketClientOptions
  private connectionPromise: Promise<void> | null = null

  constructor(options: SocketClientOptions = {}) {
    this.options = {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      ...options
    }
    this.maxReconnectAttempts = this.options.reconnectionAttempts || 5
  }

  // Initialize connection
  async connect(token: string, userData: { userId: string; name: string; avatar?: string }) {
    if (this.socket?.connected) {
      console.log('Socket already connected')
      return
    }

    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = this.establishConnection(token, userData)
    return this.connectionPromise
  }

  private async establishConnection(token: string, userData: { userId: string; name: string; avatar?: string }) {
    try {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin

      this.socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        reconnection: this.options.reconnection,
        reconnectionAttempts: this.options.reconnectionAttempts,
        reconnectionDelay: this.options.reconnectionDelay,
      })

      this.setupEventHandlers()

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, 10000)

        this.socket!.on('connect', () => {
          clearTimeout(timeout)
          console.log('Socket connected successfully')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.connectionPromise = null
          
          // Send user data
          this.socket!.emit('user_connected', userData)
          resolve()
        })

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout)
          console.error('Socket connection error:', error)
          reject(error)
        })
      })

    } catch (error) {
      console.error('Failed to establish socket connection:', error)
      this.connectionPromise = null
      throw error
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.emit('connection_status', { connected: true })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      this.isConnected = false
      this.emit('connection_status', { connected: false, reason })
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`)
      this.isConnected = true
      this.reconnectAttempts = 0
      this.emit('connection_status', { connected: true, reconnected: true })
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket reconnection attempt ${attemptNumber}`)
      this.reconnectAttempts = attemptNumber
      this.emit('reconnect_attempt', { attemptNumber })
    })

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error)
      this.emit('reconnect_error', { error })
    })

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed')
      this.isConnected = false
      this.emit('reconnect_failed', {})
    })

    // Ride events
    this.socket.on('ride_joined', (data) => {
      console.log('Joined ride:', data)
      this.emit('ride_joined', data)
    })

    this.socket.on('user_joined_ride', (data) => {
      console.log('User joined ride:', data)
      this.emit('user_joined_ride', data)
    })

    this.socket.on('user_left_ride', (data) => {
      console.log('User left ride:', data)
      this.emit('user_left_ride', data)
    })

    // Chat events
    this.socket.on('new_message', (data) => {
      console.log('New message:', data)
      this.emit('new_message', data)
    })

    this.socket.on('user_typing', (data) => {
      this.emit('user_typing', data)
    })

    this.socket.on('message_error', (data) => {
      console.error('Message error:', data)
      this.emit('message_error', data)
    })

    // Location events
    this.socket.on('location_update', (data) => {
      this.emit('location_update', data)
    })

    this.socket.on('location_error', (data) => {
      console.error('Location error:', data)
      this.emit('location_error', data)
    })

    // Safety events
    this.socket.on('safety_alert', (data) => {
      console.log('Safety alert:', data)
      this.emit('safety_alert', data)
    })

    this.socket.on('safety_alert_error', (data) => {
      console.error('Safety alert error:', data)
      this.emit('safety_alert_error', data)
    })

    // Call events
    this.socket.on('incoming_call', (data) => {
      console.log('Incoming call:', data)
      this.emit('incoming_call', data)
    })

    this.socket.on('call_initiated', (data) => {
      console.log('Call initiated:', data)
      this.emit('call_initiated', data)
    })

    this.socket.on('call_answered', (data) => {
      console.log('Call answered:', data)
      this.emit('call_answered', data)
    })

    this.socket.on('call_ended', (data) => {
      console.log('Call ended:', data)
      this.emit('call_ended', data)
    })

    this.socket.on('call_error', (data) => {
      console.error('Call error:', data)
      this.emit('call_error', data)
    })

    // Notification events
    this.socket.on('notification', (data) => {
      this.emit('notification', data)
    })

    // ETA events
    this.socket.on('eta_update', (data) => {
      this.emit('eta_update', data)
    })

    // Server events
    this.socket.on('server_shutdown', (data) => {
      console.log('Server shutdown:', data)
      this.emit('server_shutdown', data)
    })

    // Heartbeat
    setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat')
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  // Emit event to server
  emitToServer(event: string, data: any) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot emit:', event)
      return false
    }

    this.socket.emit(event, data)
    return true
  }

  // Join ride room
  joinRide(rideId: string) {
    return this.emitToServer('join_ride', rideId)
  }

  // Leave ride room
  leaveRide(rideId: string) {
    return this.emitToServer('leave_ride', rideId)
  }

  // Send chat message
  sendMessage(data: {
    rideId: string
    content: string
    type: 'text' | 'image' | 'location' | 'voice'
    metadata?: any
  }) {
    return this.emitToServer('send_message', data)
  }

  // Send typing indicator
  startTyping(rideId: string) {
    return this.emitToServer('typing_start', { rideId })
  }

  stopTyping(rideId: string) {
    return this.emitToServer('typing_stop', { rideId })
  }

  // Send location update
  updateLocation(data: {
    rideId: string
    latitude: number
    longitude: number
    speed?: number
    heading?: number
  }) {
    return this.emitToServer('location_update', data)
  }

  // Send safety alert
  sendSafetyAlert(data: {
    rideId: string
    alertType: string
    severity: string
    description?: string
    location?: any
  }) {
    return this.emitToServer('safety_alert', data)
  }

  // Initiate call
  initiateCall(data: {
    rideId: string
    calleeId: string
    callType: 'voice' | 'video'
  }) {
    return this.emitToServer('call_initiate', data)
  }

  // Answer call
  answerCall(callId: string) {
    return this.emitToServer('call_answer', { callId })
  }

  // End call
  endCall(callId: string) {
    return this.emitToServer('call_end', { callId })
  }

  // Event listener management
  on(event: string, handler: (data: any) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  off(event: string, handler?: (data: any) => void) {
    if (!this.eventHandlers.has(event)) return

    const handlers = this.eventHandlers.get(event)!
    if (handler) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    } else {
      this.eventHandlers.set(event, [])
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error('Error in event handler:', error)
      }
    })
  }

  // Connection status
  get connected() {
    return this.isConnected && this.socket?.connected
  }

  get connecting() {
    return this.socket?.disconnected === false && !this.socket?.connected || false
  }

  get disconnected() {
    return !this.connected
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnected = false
    this.connectionPromise = null
  }

  // Get connection stats
  getConnectionStats() {
    return {
      connected: this.connected,
      connecting: this.connecting,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      socketId: this.socket?.id || null,
      transport: this.socket?.io.engine.transport.name || null
    }
  }
}

// Singleton instance
let socketClient: SocketClient | null = null

export const getSocketClient = (options?: SocketClientOptions): SocketClient => {
  if (!socketClient) {
    socketClient = new SocketClient(options)
  }
  return socketClient
}

export const useSocketClient = (options?: SocketClientOptions) => {
  return getSocketClient(options)
}

export { SocketClient }
