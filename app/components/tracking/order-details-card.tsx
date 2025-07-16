
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Package, Store, MapPin, CreditCard, Clock } from 'lucide-react'

interface OrderDetailsCardProps {
  order: any
  vendor: any
}

export function OrderDetailsCard({ order, vendor }: OrderDetailsCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Order Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Order Info */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Order #</span>
              <span className="text-sm text-gray-900">{order.orderNumber}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Placed</span>
              <span className="text-sm text-gray-900">
                {formatDate(order.createdAt)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Vendor Info */}
          <div>
            <div className="flex items-center mb-2">
              <Store className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Restaurant</span>
            </div>
            <div className="ml-6">
              <p className="text-sm font-medium text-gray-900">{vendor?.businessName}</p>
              <p className="text-sm text-gray-600">{vendor?.address}</p>
              {vendor?.phone && (
                <p className="text-sm text-gray-600">{vendor.phone}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Delivery Info */}
          <div>
            <div className="flex items-center mb-2">
              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {order.isDelivery ? 'Delivery Address' : 'Pickup'}
              </span>
            </div>
            <div className="ml-6">
              <p className="text-sm text-gray-600">
                {order.isDelivery ? order.deliveryAddress : 'Pickup at restaurant'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Payment Info */}
          <div>
            <div className="flex items-center mb-2">
              <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Payment</span>
            </div>
            <div className="ml-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Method</span>
                <span className="text-sm text-gray-900">
                  {order.paymentMethod || 'Card'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-gray-600">Status</span>
                <Badge 
                  variant={order.paymentStatus === 'COMPLETED' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {order.paymentStatus}
                </Badge>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          {order.specialInstructions && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Special Instructions</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {order.specialInstructions}
                </p>
              </div>
            </>
          )}

          {/* Timing Info */}
          <Separator />
          <div>
            <div className="flex items-center mb-2">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Timing</span>
            </div>
            <div className="ml-6 space-y-1">
              {order.estimatedDelivery && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Estimated</span>
                  <span className="text-sm text-gray-900">
                    {new Date(order.estimatedDelivery).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {order.actualDelivery && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Delivered</span>
                  <span className="text-sm text-gray-900">
                    {new Date(order.actualDelivery).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
