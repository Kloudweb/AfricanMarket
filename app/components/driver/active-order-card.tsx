
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  MapPin, 
  Clock, 
  Package, 
  Phone,
  Store,
  Navigation,
  Camera,
  CheckCircle,
  Truck
} from 'lucide-react'
import { toast } from 'sonner'

interface ActiveOrderCardProps {
  order: any
  onOrderUpdate: () => void
}

export function ActiveOrderCard({ order, onOrderUpdate }: ActiveOrderCardProps) {
  const [updating, setUpdating] = useState(false)
  const [confirmingDelivery, setConfirmingDelivery] = useState(false)
  const [deliveryNotes, setDeliveryNotes] = useState('')

  const updateOrderStatus = async (status: string, message: string) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${order.id}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, message })
      })

      if (response.ok) {
        toast.success('Order status updated successfully')
        onOrderUpdate()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update order status')
      }
    } catch (error) {
      toast.error('Failed to update order status')
    } finally {
      setUpdating(false)
    }
  }

  const confirmDelivery = async () => {
    setConfirmingDelivery(true)
    try {
      // Get current location
      const location = await getCurrentLocation()
      
      const response = await fetch(`/api/orders/${order.id}/delivery-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          notes: deliveryNotes,
          photos: [] // In a real app, implement photo upload
        })
      })

      if (response.ok) {
        toast.success('Delivery confirmed successfully')
        onOrderUpdate()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to confirm delivery')
      }
    } catch (error) {
      toast.error('Failed to confirm delivery')
    } finally {
      setConfirmingDelivery(false)
    }
  }

  const getCurrentLocation = (): Promise<{ latitude: number, longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  const getStatusActions = () => {
    switch (order.status) {
      case 'READY_FOR_PICKUP':
        return [
          {
            label: 'Mark Picked Up',
            action: () => updateOrderStatus('OUT_FOR_DELIVERY', 'Order picked up from restaurant'),
            variant: 'default' as const
          }
        ]
      case 'OUT_FOR_DELIVERY':
        return [
          {
            label: 'Confirm Delivery',
            action: () => setConfirmingDelivery(true),
            variant: 'default' as const
          }
        ]
      default:
        return []
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY_FOR_PICKUP': return 'bg-blue-100 text-blue-800'
      case 'OUT_FOR_DELIVERY': return 'bg-purple-100 text-purple-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'READY_FOR_PICKUP': return 'Ready for Pickup'
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery'
      case 'DELIVERED': return 'Delivered'
      default: return status
    }
  }

  const statusActions = getStatusActions()

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Order #{order.orderNumber}
          </CardTitle>
          <Badge className={getStatusColor(order.status)}>
            {getStatusText(order.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Restaurant Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <Store className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">{order.vendor.businessName}</p>
                <p className="text-sm text-gray-600">{order.vendor.address}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${order.vendor.latitude},${order.vendor.longitude}`
                  window.open(url, '_blank')
                }}
              >
                <Navigation className="h-4 w-4" />
              </Button>
              {order.vendor.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={`tel:${order.vendor.phone}`}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Delivery Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <MapPin className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium">Delivery Address</p>
                <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLatitude},${order.deliveryLongitude}`
                window.open(url, '_blank')
              }}
            >
              <Navigation className="h-4 w-4" />
            </Button>
          </div>

          <Separator />

          {/* Order Items */}
          <div>
            <p className="font-medium mb-2">Items ({order.items.length})</p>
            <div className="space-y-2">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <div className="flex items-center space-x-2">
                    {item.product.image && (
                      <img 
                        src={item.product.image} 
                        alt={item.product.name}
                        className="h-8 w-8 object-cover rounded"
                      />
                    )}
                    <span className="text-sm">{item.quantity}x {item.product.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Estimate */}
          {order.timeEstimate && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Estimated Delivery</span>
                </div>
                <span className="text-sm text-gray-600">
                  {order.timeEstimate.estimatedDelivery ? 
                    new Date(order.timeEstimate.estimatedDelivery).toLocaleTimeString() : 
                    'N/A'
                  }
                </span>
              </div>
            </>
          )}

          {/* Action Buttons */}
          {statusActions.length > 0 && (
            <>
              <Separator />
              <div className="flex items-center space-x-2">
                {statusActions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant}
                    onClick={action.action}
                    disabled={updating}
                    className="flex-1"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </>
          )}

          {/* Delivery Confirmation Modal */}
          {confirmingDelivery && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Confirm Delivery
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="delivery-notes">Delivery Notes (Optional)</Label>
                  <Textarea
                    id="delivery-notes"
                    placeholder="Any notes about the delivery..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={confirmDelivery}
                    disabled={updating}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Delivery
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmingDelivery(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
