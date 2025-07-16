
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { OrderTrackingMap } from '@/components/tracking/order-tracking-map'
import { OrderStatusTimeline } from '@/components/tracking/order-status-timeline'
import { OrderChatWindow } from '@/components/tracking/order-chat-window'
import { DriverInfoCard } from '@/components/tracking/driver-info-card'
import { OrderDetailsCard } from '@/components/tracking/order-details-card'
import { EstimatedTimeCard } from '@/components/tracking/estimated-time-card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  MapPin, 
  Clock, 
  Phone, 
  MessageSquare, 
  Truck, 
  RefreshCw,
  AlertCircle 
} from 'lucide-react'
import { toast } from 'sonner'

interface OrderTrackingContentProps {
  orderId: string
}

export function OrderTrackingContent({ orderId }: OrderTrackingContentProps) {
  const { data: session } = useSession()
  const [orderData, setOrderData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showChat, setShowChat] = useState(false)

  // Fetch order tracking data
  const fetchOrderTracking = async () => {
    try {
      setRefreshing(true)
      const response = await fetch(`/api/orders/${orderId}/tracking`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch order tracking')
      }
      
      const data = await response.json()
      setOrderData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Set up real-time updates
  useEffect(() => {
    if (!session?.user?.id) return

    fetchOrderTracking()

    // Set up real-time connection (WebSocket simulation)
    const interval = setInterval(fetchOrderTracking, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [orderId, session])

  // Handle manual refresh
  const handleRefresh = () => {
    fetchOrderTracking()
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'PREPARING': return 'bg-orange-100 text-orange-800'
      case 'READY_FOR_PICKUP': return 'bg-purple-100 text-purple-800'
      case 'OUT_FOR_DELIVERY': return 'bg-indigo-100 text-indigo-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Format status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Order Placed'
      case 'CONFIRMED': return 'Order Confirmed'
      case 'PREPARING': return 'Being Prepared'
      case 'READY_FOR_PICKUP': return 'Ready for Pickup'
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery'
      case 'DELIVERED': return 'Delivered'
      case 'CANCELLED': return 'Cancelled'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Order</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Order Not Found</h3>
        </div>
      </div>
    )
  }

  const { order, tracking, driver, vendor, timeEstimate, deliveryConfirmation } = orderData

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Order #{order.orderNumber}</CardTitle>
              <p className="text-gray-600 mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={getStatusColor(order.status)}>
                {getStatusText(order.status)}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Status and Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderStatusTimeline 
                tracking={tracking} 
                currentStatus={order.status} 
                timeEstimate={timeEstimate}
              />
            </CardContent>
          </Card>

          {/* Live Map */}
          {(driver || order.isDelivery) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Live Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTrackingMap
                  orderId={orderId}
                  vendor={vendor}
                  driver={driver}
                  deliveryLocation={{
                    latitude: order.deliveryLatitude,
                    longitude: order.deliveryLongitude,
                    address: order.deliveryAddress
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Delivery Confirmation */}
          {deliveryConfirmation && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Confirmation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-green-600">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-3" />
                    <span className="font-medium">Delivered successfully</span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>Delivered by {deliveryConfirmation.driver?.user?.name}</p>
                    <p>Time: {new Date(deliveryConfirmation.timestamp).toLocaleString()}</p>
                  </div>

                  {deliveryConfirmation.photos?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Delivery Photos</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {deliveryConfirmation.photos.map((photo: string, index: number) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Delivery photo ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {deliveryConfirmation.notes && (
                    <div>
                      <h4 className="font-medium mb-2">Delivery Notes</h4>
                      <p className="text-sm text-gray-600">{deliveryConfirmation.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Order Details, Driver Info, etc. */}
        <div className="space-y-6">
          {/* Estimated Time */}
          {timeEstimate && (
            <EstimatedTimeCard timeEstimate={timeEstimate} orderStatus={order.status} />
          )}

          {/* Driver Information */}
          {driver && (
            <DriverInfoCard driver={driver} />
          )}

          {/* Order Details */}
          <OrderDetailsCard order={order} vendor={vendor} />

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowChat(!showChat)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {showChat ? 'Hide' : 'Show'} Chat
                </Button>

                {vendor?.phone && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`tel:${vendor.phone}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Call Restaurant
                    </a>
                  </Button>
                )}

                {driver?.user?.phone && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`tel:${driver.user.phone}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Call Driver
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Chat Window */}
      {showChat && (
        <Card>
          <CardHeader>
            <CardTitle>Order Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderChatWindow orderId={orderId} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
