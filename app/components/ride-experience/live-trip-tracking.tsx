
'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Car, 
  Phone, 
  MessageCircle,
  Route,
  Activity,
  Signal,
  Battery,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Circle
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TripTrackingData {
  ride: {
    id: string
    status: string
    pickupAddress: string
    pickupLatitude: number
    pickupLongitude: number
    destinationAddress: string
    destinationLatitude: number
    destinationLongitude: number
    distance?: number
    estimatedDuration?: number
    driver?: {
      id: string
      user: {
        id: string
        name: string
        phone: string
        avatar?: string
      }
      vehicleType: string
      vehicleMake: string
      vehicleModel: string
      vehicleColor: string
      vehiclePlate: string
      rating: number
      totalRides: number
      currentLatitude?: number
      currentLongitude?: number
    }
    customer: {
      id: string
      name: string
      phone: string
      avatar?: string
    }
  }
  latestTracking?: {
    id: string
    latitude: number
    longitude: number
    heading?: number
    speed?: number
    tripStatus: string
    distanceTraveled?: number
    timeElapsed?: number
    currentAddress?: string
    nextWaypoint?: string
    distanceToDestination?: number
    batteryLevel?: number
    connectionType?: string
    signalStrength?: number
    timestamp: string
  }
  latestETA?: {
    id: string
    estimatedArrival: string
    distanceRemaining: number
    timeRemaining: number
    currentSpeed?: number
    trafficCondition?: string
    weatherCondition?: string
    confidence?: number
    varianceRange?: number
  }
  tripRoute?: {
    id: string
    routeData: any
    totalDistance: number
    totalDuration: number
    waypoints: Array<{
      id: string
      sequence: number
      latitude: number
      longitude: number
      address?: string
      instruction?: string
      isCompleted: boolean
    }>
  }
  isLiveTracking: boolean
}

interface LiveTripTrackingProps {
  rideId: string
  onChatClick?: () => void
  onCallClick?: () => void
  onShareTrip?: () => void
  onEmergencyAlert?: () => void
}

export default function LiveTripTracking({ 
  rideId, 
  onChatClick, 
  onCallClick, 
  onShareTrip, 
  onEmergencyAlert 
}: LiveTripTrackingProps) {
  const [trackingData, setTrackingData] = useState<TripTrackingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchTrackingData()
    // Update every 5 seconds
    intervalRef.current = setInterval(fetchTrackingData, 5000)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [rideId])

  const fetchTrackingData = async () => {
    try {
      const response = await fetch(`/api/ride-experience/tracking?rideId=${rideId}`)
      const data = await response.json()
      
      if (data.success) {
        setTrackingData(data.data)
        setLastUpdate(new Date())
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch tracking data')
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error)
      setError('Failed to fetch tracking data')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'DRIVER_ASSIGNED':
        return 'bg-blue-100 text-blue-800'
      case 'DRIVER_ARRIVING':
        return 'bg-orange-100 text-orange-800'
      case 'DRIVER_ARRIVED':
        return 'bg-purple-100 text-purple-800'
      case 'PASSENGER_PICKED_UP':
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Finding Driver'
      case 'DRIVER_ASSIGNED':
        return 'Driver Assigned'
      case 'DRIVER_ARRIVING':
        return 'Driver Arriving'
      case 'DRIVER_ARRIVED':
        return 'Driver Arrived'
      case 'PASSENGER_PICKED_UP':
        return 'Passenger Picked Up'
      case 'IN_PROGRESS':
        return 'Trip in Progress'
      case 'COMPLETED':
        return 'Trip Completed'
      case 'CANCELLED':
        return 'Trip Cancelled'
      default:
        return status
    }
  }

  const formatETA = (etaString: string) => {
    const eta = new Date(etaString)
    const now = new Date()
    const diffInMinutes = Math.round((eta.getTime() - now.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 0) {
      return 'Arrived'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min`
    } else {
      return format(eta, 'HH:mm')
    }
  }

  const calculateProgress = () => {
    if (!trackingData?.latestTracking || !trackingData?.ride.distance) {
      return 0
    }
    
    const totalDistance = trackingData.ride.distance
    const distanceTraveled = trackingData.latestTracking.distanceTraveled || 0
    
    return Math.min((distanceTraveled / totalDistance) * 100, 100)
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !trackingData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error || 'Failed to load tracking data'}</p>
            <Button 
              variant="outline" 
              onClick={fetchTrackingData}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { ride, latestTracking, latestETA, tripRoute, isLiveTracking } = trackingData

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Circle className="h-8 w-8 text-blue-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    isLiveTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  )} />
                </div>
              </div>
              <div>
                <Badge className={cn('mb-1', getStatusColor(ride.status))}>
                  {getStatusText(ride.status)}
                </Badge>
                <p className="text-sm text-gray-500">
                  {isLiveTracking ? 'Live tracking' : 'Last update: ' + (lastUpdate ? format(lastUpdate, 'HH:mm') : 'Never')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onChatClick}
                className="text-gray-500 hover:text-gray-700"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCallClick}
                className="text-gray-500 hover:text-gray-700"
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Trip Progress</span>
                <span>{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>
            
            {/* Route Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <div>
                  <p className="font-medium text-sm">From</p>
                  <p className="text-sm text-gray-600">{ride.pickupAddress}</p>
                </div>
              </div>
              <Route className="h-4 w-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <div>
                  <p className="font-medium text-sm">To</p>
                  <p className="text-sm text-gray-600">{ride.destinationAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Driver Info */}
      {ride.driver && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Driver Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={ride.driver.user.avatar} />
                <AvatarFallback>
                  {ride.driver.user.name?.charAt(0) || 'D'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{ride.driver.user.name}</h3>
                  <Badge variant="outline">
                    ⭐ {ride.driver.rating?.toFixed(1) || 'N/A'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {ride.driver.totalRides} rides completed
                </p>
                <p className="text-sm text-gray-600">
                  {ride.driver.vehicleColor} {ride.driver.vehicleMake} {ride.driver.vehicleModel}
                </p>
                <p className="text-sm text-gray-600">
                  Plate: {ride.driver.vehiclePlate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Tracking Info */}
      {latestTracking && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Live Location
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">
                    Speed: {latestTracking.speed?.toFixed(0) || 0} km/h
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {latestTracking.currentAddress || 'Getting location...'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Battery className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">
                    Battery: {latestTracking.batteryLevel || 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Signal className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">
                    Signal: {latestTracking.signalStrength || 0}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ETA Information */}
      {latestETA && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Estimated Arrival
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatETA(latestETA.estimatedArrival)}
                </p>
                <p className="text-sm text-gray-600">
                  {(latestETA.distanceRemaining).toFixed(1)} km remaining
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Traffic: {latestETA.trafficCondition || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600">
                  Confidence: {((latestETA.confidence || 0) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={onShareTrip}
          className="flex-1"
        >
          <Route className="h-4 w-4 mr-2" />
          Share Trip
        </Button>
        <Button 
          variant="destructive" 
          onClick={onEmergencyAlert}
          className="flex-1"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Emergency
        </Button>
      </div>
    </div>
  )
}
