
'use client'

import { CheckCircle, Clock, Package, Truck, MapPin, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface OrderStatusTimelineProps {
  tracking: any[]
  currentStatus: string
  timeEstimate?: any
}

export function OrderStatusTimeline({ tracking, currentStatus, timeEstimate }: OrderStatusTimelineProps) {
  const statusSteps = [
    {
      status: 'PENDING',
      label: 'Order Placed',
      description: 'Your order has been placed',
      icon: Package
    },
    {
      status: 'CONFIRMED',
      label: 'Order Confirmed',
      description: 'Restaurant confirmed your order',
      icon: CheckCircle
    },
    {
      status: 'PREPARING',
      label: 'Being Prepared',
      description: 'Your food is being prepared',
      icon: Clock
    },
    {
      status: 'READY_FOR_PICKUP',
      label: 'Ready for Pickup',
      description: 'Order is ready, driver assigned',
      icon: Truck
    },
    {
      status: 'OUT_FOR_DELIVERY',
      label: 'Out for Delivery',
      description: 'Driver is on the way',
      icon: Truck
    },
    {
      status: 'DELIVERED',
      label: 'Delivered',
      description: 'Order delivered successfully',
      icon: CheckCircle
    }
  ]

  const getStatusIndex = (status: string) => {
    return statusSteps.findIndex(step => step.status === status)
  }

  const currentStatusIndex = getStatusIndex(currentStatus)
  const isCancelled = currentStatus === 'CANCELLED'

  const getStepStatus = (stepIndex: number) => {
    if (isCancelled) {
      return stepIndex === 0 ? 'completed' : 'cancelled'
    }
    
    if (stepIndex < currentStatusIndex) return 'completed'
    if (stepIndex === currentStatusIndex) return 'current'
    return 'pending'
  }

  const getStatusColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'current': return 'text-blue-600 bg-blue-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-400 bg-gray-100'
    }
  }

  const getLineColor = (stepIndex: number) => {
    const stepStatus = getStepStatus(stepIndex)
    if (stepStatus === 'completed') return 'bg-green-500'
    if (stepStatus === 'current') return 'bg-blue-500'
    return 'bg-gray-300'
  }

  return (
    <div className="space-y-6">
      {/* Status Steps */}
      <div className="relative">
        {statusSteps.map((step, index) => {
          const stepStatus = getStepStatus(index)
          const Icon = step.icon
          const isLast = index === statusSteps.length - 1
          const trackingEntry = tracking.find(t => t.status === step.status)

          if (isCancelled && index > 0) {
            return null
          }

          return (
            <div key={step.status} className="relative flex items-start pb-6">
              {/* Vertical Line */}
              {!isLast && (
                <div className="absolute left-4 top-10 w-0.5 h-8 bg-gray-300" />
              )}
              
              {/* Status Icon */}
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(stepStatus)}
                ${stepStatus === 'current' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
              `}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Status Content */}
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium ${
                    stepStatus === 'completed' ? 'text-green-700' :
                    stepStatus === 'current' ? 'text-blue-700' :
                    stepStatus === 'cancelled' ? 'text-red-700' :
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </h3>
                  
                  {trackingEntry && (
                    <span className="text-sm text-gray-500">
                      {new Date(trackingEntry.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                
                <p className={`text-sm mt-1 ${
                  stepStatus === 'completed' ? 'text-green-600' :
                  stepStatus === 'current' ? 'text-blue-600' :
                  stepStatus === 'cancelled' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {trackingEntry?.message || step.description}
                </p>

                {/* Time Estimates */}
                {stepStatus === 'current' && timeEstimate && (
                  <div className="mt-2 space-y-1">
                    {step.status === 'PREPARING' && timeEstimate.estimatedPickup && (
                      <Badge variant="outline" className="text-xs">
                        Ready by: {new Date(timeEstimate.estimatedPickup).toLocaleTimeString()}
                      </Badge>
                    )}
                    {step.status === 'OUT_FOR_DELIVERY' && timeEstimate.estimatedDelivery && (
                      <Badge variant="outline" className="text-xs">
                        Delivery by: {new Date(timeEstimate.estimatedDelivery).toLocaleTimeString()}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Cancelled Status */}
        {isCancelled && (
          <div className="relative flex items-start">
            <div className="flex items-center justify-center w-8 h-8 rounded-full text-red-600 bg-red-100">
              <XCircle className="h-4 w-4" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="font-medium text-red-700">Order Cancelled</h3>
              <p className="text-sm text-red-600 mt-1">
                {tracking.find(t => t.status === 'CANCELLED')?.message || 'Your order has been cancelled'}
              </p>
              {tracking.find(t => t.status === 'CANCELLED') && (
                <span className="text-sm text-gray-500 mt-1 block">
                  {new Date(tracking.find(t => t.status === 'CANCELLED').timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Additional Tracking Events */}
      {tracking.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-sm text-gray-700 mb-3">Detailed History</h4>
          <div className="space-y-2">
            {tracking.slice().reverse().map((event, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-gray-400 rounded-full" />
                  <span className="text-gray-700">{event.message}</span>
                </div>
                <span className="text-gray-500">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
