
'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { 
  Clock, 
  MapPin, 
  Star, 
  Navigation, 
  DollarSign, 
  Package, 
  Car,
  Phone,
  MessageCircle,
  AlertTriangle
} from 'lucide-react'
import { MatchingAssignment } from '@/lib/types'

interface DriverAssignmentCardProps {
  assignment: MatchingAssignment & {
    order?: any
    ride?: any
  }
  onResponse: (assignmentId: string, response: 'ACCEPTED' | 'REJECTED', reason?: string) => void
  isResponding?: boolean
}

export default function DriverAssignmentCard({ 
  assignment, 
  onResponse, 
  isResponding = false 
}: DriverAssignmentCardProps) {
  const [showRejectionForm, setShowRejectionForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const isOrderAssignment = assignment.assignmentType === 'ORDER'
  const data = isOrderAssignment ? assignment.order : assignment.ride

  const timeRemaining = Math.max(0, 
    Math.floor((new Date(assignment.responseTimeout).getTime() - Date.now()) / 1000)
  )

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAccept = () => {
    onResponse(assignment.id, 'ACCEPTED')
  }

  const handleReject = () => {
    if (rejectionReason.trim()) {
      onResponse(assignment.id, 'REJECTED', rejectionReason)
      setShowRejectionForm(false)
      setRejectionReason('')
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-100 text-red-800'
    if (priority >= 6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  return (
    <Card className="w-full max-w-md mx-auto border-2 border-blue-200 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-full">
              {isOrderAssignment ? (
                <Package className="w-5 h-5 text-blue-600" />
              ) : (
                <Car className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {isOrderAssignment ? 'Food Delivery' : 'Ride Request'}
              </CardTitle>
              <p className="text-sm text-gray-600">
                {isOrderAssignment ? `Order #${data?.orderNumber}` : `Ride #${data?.rideNumber}`}
              </p>
            </div>
          </div>
          <Badge className={getPriorityColor(assignment.priority)}>
            Priority {assignment.priority}
          </Badge>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <Clock className="w-4 h-4" />
          <span className="font-medium">
            {timeRemaining > 0 ? `${formatTime(timeRemaining)} remaining` : 'Expired'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Distance and ETA */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Navigation className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">{assignment.distance.toFixed(1)} km</p>
              <p className="text-xs text-gray-500">Distance</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">{assignment.eta} min</p>
              <p className="text-xs text-gray-500">ETA</p>
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Pickup Location</p>
              <p className="text-sm text-gray-600">
                {isOrderAssignment ? data?.vendor?.address : data?.pickupAddress}
              </p>
            </div>
          </div>
          
          {!isOrderAssignment && (
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Destination</p>
                <p className="text-sm text-gray-600">{data?.destinationAddress}</p>
              </div>
            </div>
          )}
        </div>

        {/* Order/Ride Details */}
        {isOrderAssignment ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Restaurant</p>
              <p className="text-sm text-gray-600">{data?.vendor?.businessName}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Items</p>
              <p className="text-sm text-gray-600">{data?.items?.length || 0} items</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Total</p>
              <p className="text-sm font-medium text-green-600">
                ${data?.totalAmount?.toFixed(2)}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Customer</p>
              <p className="text-sm text-gray-600">{data?.customer?.name}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Passengers</p>
              <p className="text-sm text-gray-600">{data?.passengers || 1}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Estimated Fare</p>
              <p className="text-sm font-medium text-green-600">
                ${data?.estimatedFare?.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Matching Score */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Matching Score</p>
            <p className={`text-sm font-bold ${getScoreColor(assignment.totalScore)}`}>
              {(assignment.totalScore * 100).toFixed(0)}%
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>Distance:</span>
              <span className={getScoreColor(assignment.distanceScore)}>
                {(assignment.distanceScore * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Rating:</span>
              <span className={getScoreColor(assignment.ratingScore)}>
                {(assignment.ratingScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {(data?.specialInstructions || data?.notes) && (
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-800">Special Instructions</p>
            </div>
            <p className="text-sm text-yellow-700">
              {data?.specialInstructions || data?.notes}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {!showRejectionForm ? (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setShowRejectionForm(true)}
              variant="outline"
              className="w-full"
              disabled={isResponding || timeRemaining <= 0}
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={isResponding || timeRemaining <= 0}
            >
              {isResponding ? 'Accepting...' : 'Accept'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Reason for declining (optional)
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason..."
                className="min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowRejectionForm(false)}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={isResponding}
              >
                {isResponding ? 'Declining...' : 'Confirm Decline'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
