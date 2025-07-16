
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { getSocketClient, SocketClient } from '@/lib/socket-client'

interface UseSocketOptions {
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

interface SocketState {
  connected: boolean
  connecting: boolean
  error: Error | null
  reconnectAttempts: number
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { data: session } = useSession()
  const [socketState, setSocketState] = useState<SocketState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0
  })
  
  const socketRef = useRef<SocketClient | null>(null)
  const mountedRef = useRef(true)

  // Initialize socket client
  useEffect(() => {
    if (session?.user && !socketRef.current) {
      socketRef.current = getSocketClient(options)
      
      // Set up connection status handlers
      const handleConnectionStatus = (data: { connected: boolean; reason?: string; reconnected?: boolean }) => {
        if (!mountedRef.current) return
        
        setSocketState(prev => ({
          ...prev,
          connected: data.connected,
          connecting: false,
          error: data.connected ? null : prev.error
        }))
      }

      const handleReconnectAttempt = (data: { attemptNumber: number }) => {
        if (!mountedRef.current) return
        
        setSocketState(prev => ({
          ...prev,
          reconnectAttempts: data.attemptNumber,
          connecting: true
        }))
      }

      const handleReconnectError = (data: { error: Error }) => {
        if (!mountedRef.current) return
        
        setSocketState(prev => ({
          ...prev,
          error: data.error,
          connecting: false
        }))
      }

      const handleReconnectFailed = () => {
        if (!mountedRef.current) return
        
        setSocketState(prev => ({
          ...prev,
          connected: false,
          connecting: false,
          error: new Error('Failed to reconnect to server')
        }))
      }

      // Register event handlers
      socketRef.current.on('connection_status', handleConnectionStatus)
      socketRef.current.on('reconnect_attempt', handleReconnectAttempt)
      socketRef.current.on('reconnect_error', handleReconnectError)
      socketRef.current.on('reconnect_failed', handleReconnectFailed)

      // Auto-connect if enabled
      if (options.autoConnect !== false) {
        connectSocket()
      }

      // Cleanup function
      return () => {
        if (socketRef.current) {
          socketRef.current.off('connection_status', handleConnectionStatus)
          socketRef.current.off('reconnect_attempt', handleReconnectAttempt)
          socketRef.current.off('reconnect_error', handleReconnectError)
          socketRef.current.off('reconnect_failed', handleReconnectFailed)
        }
      }
    }
  }, [session, options.autoConnect])

  // Connect to socket
  const connectSocket = useCallback(async () => {
    if (!session?.user || !socketRef.current) return

    try {
      setSocketState(prev => ({ ...prev, connecting: true, error: null }))
      
      await socketRef.current.connect(session.user.id as string, {
        userId: session.user.id!,
        name: session.user.name || 'Anonymous',
        avatar: session.user.image || undefined
      })
      
      if (mountedRef.current) {
        setSocketState(prev => ({ 
          ...prev, 
          connected: true, 
          connecting: false,
          error: null 
        }))
      }
    } catch (error) {
      console.error('Failed to connect to socket:', error)
      if (mountedRef.current) {
        setSocketState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false,
          error: error as Error 
        }))
      }
    }
  }, [session])

  // Disconnect from socket
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      setSocketState({
        connected: false,
        connecting: false,
        error: null,
        reconnectAttempts: 0
      })
    }
  }, [])

  // Join ride room
  const joinRide = useCallback((rideId: string) => {
    return socketRef.current?.joinRide(rideId) || false
  }, [])

  // Leave ride room
  const leaveRide = useCallback((rideId: string) => {
    return socketRef.current?.leaveRide(rideId) || false
  }, [])

  // Send message
  const sendMessage = useCallback((data: {
    rideId: string
    content: string
    type: 'text' | 'image' | 'location' | 'voice'
    metadata?: any
  }) => {
    return socketRef.current?.sendMessage(data) || false
  }, [])

  // Send typing indicator
  const startTyping = useCallback((rideId: string) => {
    return socketRef.current?.startTyping(rideId) || false
  }, [])

  const stopTyping = useCallback((rideId: string) => {
    return socketRef.current?.stopTyping(rideId) || false
  }, [])

  // Update location
  const updateLocation = useCallback((data: {
    rideId: string
    latitude: number
    longitude: number
    speed?: number
    heading?: number
  }) => {
    return socketRef.current?.updateLocation(data) || false
  }, [])

  // Send safety alert
  const sendSafetyAlert = useCallback((data: {
    rideId: string
    alertType: string
    severity: string
    description?: string
    location?: any
  }) => {
    return socketRef.current?.sendSafetyAlert(data) || false
  }, [])

  // Call functions
  const initiateCall = useCallback((data: {
    rideId: string
    calleeId: string
    callType: 'voice' | 'video'
  }) => {
    return socketRef.current?.initiateCall(data) || false
  }, [])

  const answerCall = useCallback((callId: string) => {
    return socketRef.current?.answerCall(callId) || false
  }, [])

  const endCall = useCallback((callId: string) => {
    return socketRef.current?.endCall(callId) || false
  }, [])

  // Event listener management
  const on = useCallback((event: string, handler: (data: any) => void) => {
    socketRef.current?.on(event, handler)
  }, [])

  const off = useCallback((event: string, handler?: (data: any) => void) => {
    socketRef.current?.off(event, handler)
  }, [])

  // Emit to server
  const emit = useCallback((event: string, data: any) => {
    return socketRef.current?.emitToServer(event, data) || false
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    // State
    connected: socketState.connected,
    connecting: socketState.connecting,
    error: socketState.error,
    reconnectAttempts: socketState.reconnectAttempts,
    
    // Actions
    connect: connectSocket,
    disconnect: disconnectSocket,
    
    // Ride functions
    joinRide,
    leaveRide,
    
    // Chat functions
    sendMessage,
    startTyping,
    stopTyping,
    
    // Location functions
    updateLocation,
    
    // Safety functions
    sendSafetyAlert,
    
    // Call functions
    initiateCall,
    answerCall,
    endCall,
    
    // Event management
    on,
    off,
    emit,
    
    // Socket instance (for advanced usage)
    socket: socketRef.current
  }
}

// Hook for specific ride connection
export const useRideSocket = (rideId: string | null, options: UseSocketOptions = {}) => {
  const socket = useSocket(options)
  const [joinedRide, setJoinedRide] = useState<string | null>(null)

  // Join ride when rideId changes
  useEffect(() => {
    if (rideId && socket.connected && joinedRide !== rideId) {
      const success = socket.joinRide(rideId)
      if (success) {
        setJoinedRide(rideId)
      }
    }
  }, [rideId, socket.connected, joinedRide, socket])

  // Leave ride when component unmounts or rideId changes
  useEffect(() => {
    return () => {
      if (joinedRide) {
        socket.leaveRide(joinedRide)
        setJoinedRide(null)
      }
    }
  }, [joinedRide, socket])

  return {
    ...socket,
    joinedRide,
    isInRide: joinedRide === rideId
  }
}

// Hook for chat functionality
export const useChatSocket = (rideId: string) => {
  const socket = useRideSocket(rideId)
  const [messages, setMessages] = useState<any[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  // Handle new messages
  useEffect(() => {
    const handleNewMessage = (data: any) => {
      setMessages(prev => [...prev, data])
    }

    const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        if (data.isTyping) {
          return prev.includes(data.userId) ? prev : [...prev, data.userId]
        } else {
          return prev.filter(id => id !== data.userId)
        }
      })
    }

    socket.on('new_message', handleNewMessage)
    socket.on('user_typing', handleUserTyping)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('user_typing', handleUserTyping)
    }
  }, [socket])

  return {
    ...socket,
    messages,
    typingUsers,
    clearMessages: () => setMessages([])
  }
}

// Hook for location tracking
export const useLocationSocket = (rideId: string) => {
  const socket = useRideSocket(rideId)
  const [currentLocation, setCurrentLocation] = useState<any>(null)
  const [locationHistory, setLocationHistory] = useState<any[]>([])

  // Handle location updates
  useEffect(() => {
    const handleLocationUpdate = (data: any) => {
      setCurrentLocation(data)
      setLocationHistory(prev => [...prev, data].slice(-100)) // Keep last 100 locations
    }

    socket.on('location_update', handleLocationUpdate)

    return () => {
      socket.off('location_update', handleLocationUpdate)
    }
  }, [socket])

  return {
    ...socket,
    currentLocation,
    locationHistory,
    clearLocationHistory: () => setLocationHistory([])
  }
}
