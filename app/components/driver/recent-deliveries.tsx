
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Package, CheckCircle, Store, Clock, DollarSign } from 'lucide-react'

interface RecentDeliveriesProps {
  deliveries: any[]
}

export function RecentDeliveries({ deliveries }: RecentDeliveriesProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateDeliveryTime = (createdAt: string, deliveredAt: string) => {
    const created = new Date(createdAt)
    const delivered = new Date(deliveredAt)
    const diffInMinutes = Math.floor((delivered.getTime() - created.getTime()) / 1000 / 60)
    return diffInMinutes
  }

  if (deliveries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Deliveries</h3>
            <p className="text-gray-600">
              Your completed deliveries will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Recent Deliveries
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deliveries.map((delivery, index) => (
            <div key={delivery.id}>
              <div className="flex items-start space-x-3">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">
                      Order #{delivery.orderNumber}
                    </p>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Delivered
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <Store className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {delivery.vendor.businessName}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {delivery.actualDelivery ? 
                            `${calculateDeliveryTime(delivery.createdAt, delivery.actualDelivery)} min` : 
                            'N/A'
                          }
                        </span>
                      </div>
                      <span>
                        {formatDate(delivery.actualDelivery || delivery.createdAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-sm">
                      <DollarSign className="h-3 w-3 text-green-500" />
                      <span className="font-medium text-green-600">
                        ${delivery.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Delivery Confirmation */}
                  {delivery.deliveryConfirmation && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <p className="text-gray-600">
                        Delivered at {formatDate(delivery.deliveryConfirmation.timestamp)}
                      </p>
                      {delivery.deliveryConfirmation.notes && (
                        <p className="text-gray-500 mt-1">
                          "{delivery.deliveryConfirmation.notes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {index < deliveries.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
