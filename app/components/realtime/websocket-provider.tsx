
'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'
import { WebSocketEvent, ConnectionStats } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'

interface WebSocketContextType {
  socket: Socket | null
  isConnected: boolean
  stats: ConnectionStats | null
  sendEvent: (event: WebSocketEvent) => void
  joinRoom: (roomId: string, roomType: string) => void
  leaveRoom: (roomId: string) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: React.ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [stats, setStats] = useState<ConnectionStats | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  useEffect(() => {
    if (!session?.user?.id) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001'
    
    const newSocket = io(wsUrl, {
      auth: {
        token: session.accessToken // You'll need to provide the access token
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      reconnectAttempts.current = 0
      
      // Send user connection data
      newSocket.emit('user_connected', {
        userId: session.user.id,
        name: session.user.name,
        avatar: session.user.image
      })
    })

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      reconnectAttempts.current++
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to real-time services. Some features may not work.',
          variant: 'destructive'
        })
      }
    })

    newSocket.on('reconnect', () => {
      console.log('WebSocket reconnected')
      toast({
        title: 'Connected',
        description: 'Real-time connection restored',
        variant: 'default'
      })
    })

    // Real-time event handlers
    newSocket.on('notification', (data) => {
      toast({
        title: data.title,
        description: data.body,
        variant: data.urgent ? 'destructive' : 'default'
      })
    })

    newSocket.on('order_status_update', (data) => {
      toast({
        title: 'Order Update',
        description: `Order #${data.orderNumber} status: ${data.status}`,
        variant: 'default'
      })
    })

    newSocket.on('ride_status_update', (data) => {
      toast({
        title: 'Ride Update',
        description: `Ride #${data.rideNumber} status: ${data.status}`,
        variant: 'default'
      })
    })

    newSocket.on('driver_location_update', (data) => {
      // Handle driver location updates
      // This would update a global state or trigger re-renders
    })

    newSocket.on('new_message', (data) => {
      toast({
        title: 'New Message',
        description: `${data.senderName}: ${data.message}`,
        variant: 'default'
      })
    })

    newSocket.on('server_shutdown', (data) => {
      toast({
        title: 'Server Maintenance',
        description: data.message,
        variant: 'destructive'
      })
    })

    newSocket.on('room_joined', (data) => {
      console.log('Joined room:', data.roomId)
    })

    newSocket.on('room_left', (data) => {
      console.log('Left room:', data.roomId)
    })

    newSocket.on('room_error', (data) => {
      toast({
        title: 'Room Error',
        description: data.message,
        variant: 'destructive'
      })
    })

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping')
      }
    }, 30000) // Send heartbeat every 30 seconds

    newSocket.on('pong', () => {
      // Handle pong response
    })

    setSocket(newSocket)

    return () => {
      clearInterval(heartbeatInterval)
      newSocket.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }, [session?.user?.id, session?.accessToken, toast])

  const sendEvent = (event: WebSocketEvent) => {
    if (socket && isConnected) {
      socket.emit('event', event)
    }
  }

  const joinRoom = (roomId: string, roomType: string) => {
    if (socket && isConnected) {
      socket.emit('join_room', { roomId, roomType })
    }
  }

  const leaveRoom = (roomId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_room', { roomId })
    }
  }

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        stats,
        sendEvent,
        joinRoom,
        leaveRoom
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

