
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  Package, 
  Car, 
  Clock, 
  MapPin, 
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  Star,
  Users
} from 'lucide-react'
import { toast } from 'sonner'

interface RequestNotification {
  id: string
  orderId?: string
  rideId?: string
  notificationType: string
  title: string
  message: string
  data?: any
  priority: string
  soundEnabled: boolean
  vibrationEnabled: boolean
  responseRequired: boolean
  expiresAt?: string
  readAt?: string
  respondedAt?: string
  response?: string
  createdAt: string
  order?: {
    id: string
    orderNumber: string
    totalAmount: number
    vendor: {
      businessName: string
      address: string
    }
  }
  ride?: {
    id: string
    rideNumber: string
    estimatedFare: number
    pickupAddress: string
    destinationAddress: string
  }
}

interface PendingRequest {
  id: string
  type: 'order' | 'ride'
  priority: number
  expiresAt: string
  order?: any
  ride?: any
}

export function RequestNotifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<RequestNotification[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications()
      fetchPendingRequests()
      
      // Set up polling for real-time updates
      const interval = setInterval(() => {
        fetchNotifications()
        fetchPendingRequests()
      }, 5000)
      
      return () => clearInterval(interval)
    }
  }, [session])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/drivers/notifications?limit=50')
      if (!response.ok) throw new Error('Failed to fetch notifications')
      
      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch('/api/drivers/requests')
      if (!response.ok) throw new Error('Failed to fetch pending requests')
      
      const data = await response.json()
      setPendingRequests([
        ...data.orderAssignments.map((assignment: any) => ({
          id: assignment.id,
          type: 'order',
          priority: assignment.priority,
          expiresAt: assignment.expiresAt,
          order: assignment.order
        })),
        ...data.rideRequests.map((ride: any) => ({
          id: ride.id,
          type: 'ride',
          priority: 1,
          expiresAt: ride.requestedAt,
          ride: ride
        }))
      ])
    } catch (error) {
      console.error('Error fetching pending requests:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/drivers/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          action: 'read'
        })
      })

      if (!response.ok) throw new Error('Failed to mark as read')
      
      setNotifications(prev => prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, readAt: new Date().toISOString() }
          : notification
      ))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const respondToRequest = async (requestId: string, requestType: 'order' | 'ride', action: 'accept' | 'reject', reason?: string) => {
    setResponding(requestId)
    
    try {
      const response = await fetch('/api/drivers/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          requestType,
          action,
          reason,
          estimatedArrival: action === 'accept' ? new Date(Date.now() + 10 * 60 * 1000) : null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to respond to request')
      }

      const data = await response.json()
      toast.success(data.message)
      
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(req => req.id !== requestId))
      
      // Refresh data
      fetchNotifications()
      fetchPendingRequests()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to respond to request')
    } finally {
      setResponding(null)
    }
  }

  const playNotificationSound = () => {
    if (soundEnabled) {
      // Play notification sound
      const audio = new Audio('/notification-sound.mp3')
      audio.play().catch(console.error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER_REQUEST': return <Package className="h-4 w-4" />
      case 'RIDE_REQUEST': return <Car className="h-4 w-4" />
      case 'BONUS_OPPORTUNITY': return <DollarSign className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800'
      case 'NORMAL': return 'bg-blue-100 text-blue-800'
      case 'LOW': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const minutes = Math.floor(diff / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const unreadCount = notifications.filter(n => !n.readAt).length
  const pendingCount = pendingRequests.length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications & Requests
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
            {pendingCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800">{pendingCount} Pending</Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="history">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <ScrollArea className="h-[400px]">
              {pendingRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="border-l-4 border-l-orange-400">
                      <CardContent className="pt-4">
                        {request.type === 'order' && request.order && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <span className="font-medium">Order #{request.order.orderNumber}</span>
                              </div>
                              <Badge className="bg-orange-100 text-orange-800">
                                {getTimeRemaining(request.expiresAt)}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{request.order.vendor.businessName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-3 w-3" />
                                <span>${request.order.totalAmount}</span>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => respondToRequest(request.id, 'order', 'accept')}
                                disabled={responding === request.id}
                                className="flex-1"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => respondToRequest(request.id, 'order', 'reject', 'Not available')}
                                disabled={responding === request.id}
                                className="flex-1"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {request.type === 'ride' && request.ride && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4" />
                                <span className="font-medium">Ride #{request.ride.rideNumber}</span>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800">
                                <Users className="h-3 w-3 mr-1" />
                                {request.ride.passengers} passenger(s)
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{request.ride.pickupAddress}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{request.ride.destinationAddress}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-3 w-3" />
                                <span>${request.ride.estimatedFare}</span>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => respondToRequest(request.id, 'ride', 'accept')}
                                disabled={responding === request.id}
                                className="flex-1"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => respondToRequest(request.id, 'ride', 'reject', 'Not available')}
                                disabled={responding === request.id}
                                className="flex-1"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="text-center">
                    <Bell className="h-8 w-8 mx-auto mb-2" />
                    <p>No pending requests</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <ScrollArea className="h-[400px]">
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.filter(n => !n.readAt).map((notification) => (
                    <Card key={notification.id} className={`cursor-pointer ${
                      !notification.readAt ? 'border-l-4 border-l-blue-400' : ''
                    }`} onClick={() => markAsRead(notification.id)}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getNotificationIcon(notification.notificationType)}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{notification.title}</span>
                                <Badge className={getPriorityColor(notification.priority)}>
                                  {notification.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{notification.message}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {notification.soundEnabled && (
                            <Volume2 className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="text-center">
                    <Bell className="h-8 w-8 mx-auto mb-2" />
                    <p>No new notifications</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <ScrollArea className="h-[400px]">
              {notifications.filter(n => n.readAt).length > 0 ? (
                <div className="space-y-4">
                  {notifications.filter(n => n.readAt).map((notification) => (
                    <Card key={notification.id} className="opacity-75">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getNotificationIcon(notification.notificationType)}
                            <div className="space-y-1">
                              <span className="font-medium">{notification.title}</span>
                              <p className="text-sm text-gray-600">{notification.message}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {notification.respondedAt && (
                            <Badge variant="outline">
                              {notification.response || 'Responded'}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p>No notification history</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
