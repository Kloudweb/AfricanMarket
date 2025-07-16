
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Utensils, Truck, MapPin } from 'lucide-react'

interface EstimatedTimeCardProps {
  timeEstimate: any
  orderStatus: string
}

export function EstimatedTimeCard({ timeEstimate, orderStatus }: EstimatedTimeCardProps) {
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-CA', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PREPARING':
        return <Utensils className="h-4 w-4 text-orange-500" />
      case 'READY_FOR_PICKUP':
        return <Truck className="h-4 w-4 text-blue-500" />
      case 'OUT_FOR_DELIVERY':
        return <MapPin className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PREPARING':
        return 'Preparation Time'
      case 'READY_FOR_PICKUP':
        return 'Pickup Time'
      case 'OUT_FOR_DELIVERY':
        return 'Delivery Time'
      default:
        return 'Estimated Time'
    }
  }

  const getCurrentEstimate = () => {
    switch (orderStatus) {
      case 'PREPARING':
        return {
          time: timeEstimate.preparationTime,
          target: timeEstimate.estimatedPickup,
          label: 'Ready for pickup'
        }
      case 'READY_FOR_PICKUP':
        return {
          time: timeEstimate.pickupTime,
          target: timeEstimate.estimatedPickup,
          label: 'Driver pickup'
        }
      case 'OUT_FOR_DELIVERY':
        return {
          time: timeEstimate.deliveryTime,
          target: timeEstimate.estimatedDelivery,
          label: 'Delivery'
        }
      default:
        return {
          time: timeEstimate.totalTime,
          target: timeEstimate.estimatedDelivery,
          label: 'Total delivery'
        }
    }
  }

  const currentEstimate = getCurrentEstimate()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Estimated Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Status Time */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              {getStatusIcon(orderStatus)}
              <span className="text-sm font-medium text-gray-700">
                {getStatusText(orderStatus)}
              </span>
            </div>
            
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatTime(currentEstimate.time)}
            </div>
            
            {currentEstimate.target && (
              <div className="text-sm text-gray-600">
                {currentEstimate.label} by {formatDateTime(currentEstimate.target)}
              </div>
            )}
          </div>

          {/* Time Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Utensils className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-gray-700">Preparation</span>
              </div>
              <span className="text-sm font-medium">
                {formatTime(timeEstimate.preparationTime)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-700">Pickup</span>
              </div>
              <span className="text-sm font-medium">
                {formatTime(timeEstimate.pickupTime)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-gray-700">Delivery</span>
              </div>
              <span className="text-sm font-medium">
                {formatTime(timeEstimate.deliveryTime)}
              </span>
            </div>

            <div className="border-t pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Time</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatTime(timeEstimate.totalTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Accuracy Indicator */}
          {timeEstimate.accuracy && (
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span>{Math.round(timeEstimate.accuracy)}% accuracy</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
