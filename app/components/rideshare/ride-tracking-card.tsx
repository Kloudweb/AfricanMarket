
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Car, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Clock, 
  User,
  Star,
  Navigation,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Ride, RideStatus } from '@/lib/types'

interface RideTrackingCardProps {
  ride: Ride
  onRideUpdate?: (ride: Ride) => void
  onCancelRide?: (rideId: string) => void
}

export function RideTrackingCard({ ride, onRideUpdate, onCancelRide }: RideTrackingCardProps) {
  const [tracking, setTracking] = useState(ride)
  const [loading, setLoading] = useState(false)
  const [estimatedArrival, setEstimatedArrival] = useState<Date | null>(null)

  useEffect(() => {
    setTracking(ride)
    
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchRideTracking()
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [ride.id])

  const fetchRideTracking = async () => {
    try {
      const response = await fetch(`/api/rideshare/tracking/${ride.id}`)
      const data = await response.json()
      
      if (data.success) {
        setTracking(data.data.ride)
        setEstimatedArrival(data.data.estimatedArrival ? new Date(data.data.estimatedArrival) : null)
        onRideUpdate?.(data.data.ride)
      }
    } catch (error) {
      console.error('Error fetching ride tracking:', error)
    }
  }

  const handleCancelRide = async () => {
    if (!onCancelRide) return
    
    setLoading(true)
    try {
      onCancelRide(ride.id)
    } catch (error) {
      console.error('Error cancelling ride:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: RideStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500'
      case 'ACCEPTED':
        return 'bg-blue-500'
      case 'DRIVER_ARRIVING':
        return 'bg-orange-500'
      case 'IN_PROGRESS':
        return 'bg-green-500'
      case 'COMPLETED':
        return 'bg-green-600'
      case 'CANCELLED':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: RideStatus) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />
      case 'ACCEPTED':
        return <CheckCircle className="h-4 w-4" />
      case 'DRIVER_ARRIVING':
        return <Navigation className="h-4 w-4" />
      case 'IN_PROGRESS':
        return <Car className="h-4 w-4" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusText = (status: RideStatus) => {
    switch (status) {
      case 'PENDING':
        return 'Looking for a driver'
      case 'ACCEPTED':
        return 'Driver assigned'
      case 'DRIVER_ARRIVING':
        return 'Driver is arriving'
      case 'IN_PROGRESS':
        return 'Ride in progress'
      case 'COMPLETED':
        return 'Ride completed'
      case 'CANCELLED':
        return 'Ride cancelled'
      default:
        return 'Unknown status'
    }
  }

  const getProgressPercentage = (status: RideStatus) => {
    switch (status) {
      case 'PENDING':
        return 10
      case 'ACCEPTED':
        return 30
      case 'DRIVER_ARRIVING':
        return 50
      case 'IN_PROGRESS':
        return 75
      case 'COMPLETED':
        return 100
      case 'CANCELLED':
        return 0
      default:
        return 0
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount)
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-CA', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const canCancelRide = tracking.status === 'PENDING' || tracking.status === 'ACCEPTED'

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Ride #{tracking.rideNumber}
          </span>
          <Badge 
            variant="secondary" 
            className={`text-white ${getStatusColor(tracking.status)}`}
          >
            {getStatusIcon(tracking.status)}
            <span className="ml-1">{getStatusText(tracking.status)}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Ride Progress</span>
            <span>{getProgressPercentage(tracking.status)}%</span>
          </div>
          <Progress value={getProgressPercentage(tracking.status)} className="h-2" />
        </div>

        {/* Route Information */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium">Pickup</p>
              <p className="text-sm text-gray-600">{tracking.pickupAddress}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium">Destination</p>
              <p className="text-sm text-gray-600">{tracking.destinationAddress}</p>
            </div>
          </div>
        </div>

        {/* Driver Information */}
        {tracking.driver && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3">Your Driver</h4>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={tracking.driver.user.avatar} />
                <AvatarFallback>
                  {tracking.driver.user.name?.charAt(0) || 'D'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{tracking.driver.user.name}</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-600">
                      {tracking.driver.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">
                  {tracking.driver.vehicleColor} {tracking.driver.vehicleMake} {tracking.driver.vehicleModel}
                </p>
                
                <p className="text-sm text-gray-600">
                  {tracking.driver.vehiclePlate}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Ride Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Ride Type</p>
            <p className="font-medium">{tracking.rideType}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Passengers</p>
            <p className="font-medium">{tracking.passengers}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Estimated Fare</p>
            <p className="font-medium text-green-600">
              {tracking.estimatedFare ? formatCurrency(tracking.estimatedFare) : 'Calculating...'}
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Distance</p>
            <p className="font-medium">
              {tracking.distance ? `${tracking.distance.toFixed(1)} km` : 'Calculating...'}
            </p>
          </div>
        </div>

        {/* Estimated Arrival */}
        {estimatedArrival && tracking.status === 'ACCEPTED' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">
                Driver arriving at {formatTime(estimatedArrival)}
              </p>
            </div>
          </div>
        )}

        {/* Trip Duration */}
        {tracking.startedAt && tracking.status === 'IN_PROGRESS' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-800">
                Trip started at {formatTime(new Date(tracking.startedAt))}
              </p>
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {tracking.notes && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
            <p className="text-sm text-gray-600">{tracking.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {canCancelRide && (
            <Button 
              variant="outline" 
              onClick={handleCancelRide}
              disabled={loading}
            >
              {loading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
              Cancel Ride
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={fetchRideTracking}
            className="flex-1"
          >
            <Navigation className="mr-2 h-4 w-4" />
            View on Map
          </Button>
        </div>

        {/* Completed Ride Actions */}
        {tracking.status === 'COMPLETED' && (
          <div className="flex gap-3">
            <Button className="flex-1">
              <Star className="mr-2 h-4 w-4" />
              Rate Driver
            </Button>
            <Button variant="outline">
              Book Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
