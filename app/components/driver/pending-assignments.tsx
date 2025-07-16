
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Package,
  Check, 
  X, 
  Store,
  Navigation
} from 'lucide-react'
import { toast } from 'sonner'

interface PendingAssignmentsProps {
  assignments: any[]
  onAssignmentResponse: () => void
}

export function PendingAssignments({ assignments, onAssignmentResponse }: PendingAssignmentsProps) {
  const [responding, setResponding] = useState<string | null>(null)

  const handleAssignmentResponse = async (assignmentId: string, response: 'ACCEPTED' | 'REJECTED') => {
    setResponding(assignmentId)
    try {
      const res = await fetch('/api/drivers/assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          response,
          message: response === 'ACCEPTED' ? 'Assignment accepted' : 'Assignment declined'
        })
      })

      if (res.ok) {
        toast.success(`Assignment ${response.toLowerCase()} successfully`)
        onAssignmentResponse()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to respond to assignment')
      }
    } catch (error) {
      toast.error('Failed to respond to assignment')
    } finally {
      setResponding(null)
    }
  }

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffInSeconds = Math.floor((expiry.getTime() - now.getTime()) / 1000)
    
    if (diffInSeconds <= 0) return 'Expired'
    
    const minutes = Math.floor(diffInSeconds / 60)
    const seconds = diffInSeconds % 60
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const calculateEarningsEstimate = (order: any) => {
    // Simple earnings calculation (in a real app, use actual rate structure)
    const baseRate = 5.00
    const perKmRate = 1.50
    const totalDistance = 5 // Estimated average distance
    
    return (baseRate + (totalDistance * perKmRate)).toFixed(2)
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Assignments</h3>
            <p className="text-gray-600">
              New delivery assignments will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <Card key={assignment.id} className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <Store className="h-5 w-5 mr-2" />
                {assignment.order.vendor.businessName}
              </CardTitle>
              <Badge variant="outline" className="bg-red-50 text-red-700">
                {formatTimeRemaining(assignment.expiresAt)} left
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Order #</p>
                  <p className="text-sm text-gray-900">{assignment.order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Total</p>
                  <p className="text-sm text-gray-900">${assignment.order.totalAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Items</p>
                <div className="space-y-1">
                  {assignment.order.items.slice(0, 3).map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-900">{item.quantity}x {item.product.name}</span>
                    </div>
                  ))}
                  {assignment.order.items.length > 3 && (
                    <p className="text-sm text-gray-500">
                      +{assignment.order.items.length - 3} more items
                    </p>
                  )}
                </div>
              </div>

              {/* Locations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Pickup</p>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      <p>{assignment.order.vendor.businessName}</p>
                      <p className="text-xs">{assignment.order.vendor.address}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Delivery</p>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      <p className="text-xs">{assignment.order.deliveryAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignment Info */}
              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {assignment.distance.toFixed(1)}km
                  </div>
                  <div className="text-xs text-gray-600">Distance</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {assignment.eta} min
                  </div>
                  <div className="text-xs text-gray-600">ETA</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    ${calculateEarningsEstimate(assignment.order)}
                  </div>
                  <div className="text-xs text-gray-600">Est. Earnings</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleAssignmentResponse(assignment.id, 'ACCEPTED')}
                  disabled={responding === assignment.id}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAssignmentResponse(assignment.id, 'REJECTED')}
                  disabled={responding === assignment.id}
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${assignment.order.vendor.latitude},${assignment.order.vendor.longitude}`
                    window.open(url, '_blank')
                  }}
                  size="sm"
                >
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
