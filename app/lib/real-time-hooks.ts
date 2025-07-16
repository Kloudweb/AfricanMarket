
// Custom hooks for real-time features
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useWebSocket } from '@/components/realtime/websocket-provider'

// Hook for real-time notifications
export function useRealTimeNotifications() {
  const { data: session } = useSession()
  const { socket } = useWebSocket()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (session?.user?.id) {
      loadNotifications()
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (socket) {
      socket.on('new_notification', (notification) => {
        setNotifications(prev => [notification, ...prev])
        setUnreadCount(prev => prev + 1)
      })

      socket.on('notification_read', (data) => {
        setNotifications(prev => prev.map(notif => 
          notif.id === data.notificationId ? { ...notif, isRead: true } : notif
        ))
        setUnreadCount(prev => Math.max(0, prev - 1))
      })

      return () => {
        socket.off('new_notification')
        socket.off('notification_read')
      }
    }
  }, [socket])

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/realtime/notifications?limit=50')
      const data = await response.json()
      
      if (response.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.stats?.unread || 0)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/realtime/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(notif => 
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        ))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  return {
    notifications,
    unreadCount,
    markAsRead,
    refresh: loadNotifications
  }
}

// Hook for real-time order tracking
export function useRealTimeOrderTracking(orderId: string) {
  const { socket } = useWebSocket()
  const [order, setOrder] = useState<any>(null)
  const [statusHistory, setStatusHistory] = useState<any[]>([])
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [eta, setEta] = useState<any>(null)

  useEffect(() => {
    if (orderId) {
      loadOrderDetails()
    }
  }, [orderId])

  useEffect(() => {
    if (socket && orderId) {
      socket.on('order_status_update', handleOrderUpdate)
      socket.on('driver_location_update', handleDriverLocationUpdate)
      socket.on('eta_update', handleETAUpdate)

      return () => {
        socket.off('order_status_update', handleOrderUpdate)
        socket.off('driver_location_update', handleDriverLocationUpdate)
        socket.off('eta_update', handleETAUpdate)
      }
    }
  }, [socket, orderId])

  const loadOrderDetails = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      const data = await response.json()
      
      if (response.ok) {
        setOrder(data.order)
        setStatusHistory(data.statusHistory || [])
      }
    } catch (error) {
      console.error('Error loading order details:', error)
    }
  }

  const handleOrderUpdate = (data: any) => {
    if (data.orderId === orderId) {
      setOrder((prev: any) => prev ? { ...prev, status: data.status } : null)
      setStatusHistory(prev => [data, ...prev])
    }
  }

  const handleDriverLocationUpdate = (data: any) => {
    if (data.currentOrderId === orderId) {
      setDriverLocation(data)
    }
  }

  const handleETAUpdate = (data: any) => {
    if (data.orderId === orderId) {
      setEta(data)
    }
  }

  return {
    order,
    statusHistory,
    driverLocation,
    eta,
    refresh: loadOrderDetails
  }
}

// Hook for real-time chat
export function useRealTimeChat(roomId: string) {
  const { socket, joinRoom, leaveRoom } = useWebSocket()
  const [messages, setMessages] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [typing, setTyping] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (roomId) {
      joinRoom(roomId, 'chat')
      loadMessages()
    }

    return () => {
      if (roomId) {
        leaveRoom(roomId)
      }
    }
  }, [roomId, joinRoom, leaveRoom])

  useEffect(() => {
    if (socket) {
      socket.on('new_message', handleNewMessage)
      socket.on('message_read', handleMessageRead)
      socket.on('user_typing', handleUserTyping)
      socket.on('user_stopped_typing', handleUserStoppedTyping)

      return () => {
        socket.off('new_message', handleNewMessage)
        socket.off('message_read', handleMessageRead)
        socket.off('user_typing', handleUserTyping)
        socket.off('user_stopped_typing', handleUserStoppedTyping)
      }
    }
  }, [socket])

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/realtime/chat/${roomId}?limit=50`)
      const data = await response.json()
      
      if (response.ok) {
        setMessages(data.messages.reverse())
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleNewMessage = (message: any) => {
    if (message.roomId === roomId) {
      setMessages(prev => [...prev, message])
      setUnreadCount(prev => prev + 1)
    }
  }

  const handleMessageRead = (data: any) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.messageId ? { ...msg, isRead: true } : msg
    ))
  }

  const handleUserTyping = (data: any) => {
    setTyping(prev => [...prev.filter(t => t.userId !== data.userId), data])
  }

  const handleUserStoppedTyping = (data: any) => {
    setTyping(prev => prev.filter(t => t.userId !== data.userId))
  }

  const sendMessage = async (message: string, type: string = 'text') => {
    try {
      const response = await fetch(`/api/realtime/chat/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, messageType: type })
      })

      return response.ok
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  const markAsRead = async () => {
    try {
      const response = await fetch(`/api/realtime/chat/${roomId}/read`, {
        method: 'POST'
      })

      if (response.ok) {
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  return {
    messages,
    participants,
    typing,
    unreadCount,
    sendMessage,
    markAsRead,
    refresh: loadMessages
  }
}

// Hook for real-time location tracking
export function useRealTimeLocation(trackingId: string, trackingType: 'order' | 'ride') {
  const { socket } = useWebSocket()
  const [location, setLocation] = useState<any>(null)
  const [eta, setEta] = useState<any>(null)
  const [route, setRoute] = useState<any>(null)

  useEffect(() => {
    if (socket && trackingId) {
      socket.on('driver_location_update', handleLocationUpdate)
      socket.on(`${trackingType}_eta_update`, handleETAUpdate)
      socket.on('route_update', handleRouteUpdate)

      return () => {
        socket.off('driver_location_update', handleLocationUpdate)
        socket.off(`${trackingType}_eta_update`, handleETAUpdate)
        socket.off('route_update', handleRouteUpdate)
      }
    }
  }, [socket, trackingId, trackingType])

  const handleLocationUpdate = (data: any) => {
    const currentId = trackingType === 'order' ? data.currentOrderId : data.currentRideId
    if (currentId === trackingId) {
      setLocation(data)
    }
  }

  const handleETAUpdate = (data: any) => {
    const id = trackingType === 'order' ? data.orderId : data.rideId
    if (id === trackingId) {
      setEta(data)
    }
  }

  const handleRouteUpdate = (data: any) => {
    const id = trackingType === 'order' ? data.orderId : data.rideId
    if (id === trackingId) {
      setRoute(data)
    }
  }

  return {
    location,
    eta,
    route
  }
}

// Hook for real-time inventory updates
export function useRealTimeInventory(productId?: string, vendorId?: string) {
  const { socket } = useWebSocket()
  const [inventory, setInventory] = useState<any[]>([])
  const [updates, setUpdates] = useState<any[]>([])

  useEffect(() => {
    if (socket) {
      socket.on('inventory_update', handleInventoryUpdate)
      socket.on('pricing_update', handlePricingUpdate)

      return () => {
        socket.off('inventory_update', handleInventoryUpdate)
        socket.off('pricing_update', handlePricingUpdate)
      }
    }
  }, [socket])

  const handleInventoryUpdate = (data: any) => {
    if (
      (!productId || data.productId === productId) &&
      (!vendorId || data.vendorId === vendorId)
    ) {
      setUpdates(prev => [data, ...prev.slice(0, 49)]) // Keep last 50 updates
    }
  }

  const handlePricingUpdate = (data: any) => {
    if (
      (!productId || data.productId === productId) &&
      (!vendorId || data.vendorId === vendorId)
    ) {
      setUpdates(prev => [data, ...prev.slice(0, 49)]) // Keep last 50 updates
    }
  }

  return {
    inventory,
    updates
  }
}

// Hook for real-time system health
export function useRealTimeSystemHealth() {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    checkHealth()
    intervalRef.current = setInterval(checkHealth, 30000) // Check every 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/realtime/health')
      const data = await response.json()
      
      setHealth(data)
    } catch (error) {
      console.error('Error checking health:', error)
      setHealth({ status: 'unknown', error: error instanceof Error ? error.message : String(error) })
    } finally {
      setLoading(false)
    }
  }

  return {
    health,
    loading,
    refresh: checkHealth
  }
}

