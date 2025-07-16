
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useWebSocket } from './websocket-provider'
import { MapPin, Navigation, Battery, Wifi, Clock, Truck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

interface LiveLocationTrackerProps {
  orderId?: string
  rideId?: string
  className?: string
}

export default function LiveLocationTracker({ orderId, rideId, className }: LiveLocationTrackerProps) {
  const { data: session } = useSession()
  const { socket, isConnected, sendEvent } = useWebSocket()
  const { toast } = useToast()
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [eta, setEta] = useState<any>(null)
  const [currentLocation, setCurrentLocation] = useState<any>(null)
  const watchId = useRef<number | null>(null)

  useEffect(() => {
    if (session?.user?.role === 'DRIVER') {
      // Start location tracking for drivers
      startLocationTracking()
    }

    // Listen for driver location updates
    if (socket) {
      socket.on('driver_location_update', handleLocationUpdate)
      socket.on('eta_update', handleETAUpdate)
      socket.on('ride_eta_update', handleRideETAUpdate)

      return () => {
        socket.off('driver_location_update', handleLocationUpdate)
        socket.off('eta_update', handleETAUpdate)
        socket.off('ride_eta_update', handleRideETAUpdate)
      }
    }

    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [socket, session?.user?.role])

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Error',
        description: 'Geolocation is not supported by this browser',
        variant: 'destructive'
      })
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          altitude: position.coords.altitude,
          isOnline: true,
          isDelivering: !!orderId,
          isRiding: !!rideId,
          currentOrderId: orderId,
          currentRideId: rideId,
          batteryLevel: getBatteryLevel(),
          timestamp: new Date()
        }

        setCurrentLocation(locationData)
        
        if (isTracking) {
          sendLocationUpdate(locationData)
        }
      },
      (error) => {
        console.error('Location error:', error)
        toast({
          title: 'Location Error',
          description: 'Failed to get location. Please check your permissions.',
          variant: 'destructive'
        })
      },
      options
    )
  }

  const sendLocationUpdate = (locationData: any) => {
    if (socket && isConnected) {
      socket.emit('location_update', locationData)
    }
  }

  const handleLocationUpdate = (data: any) => {
    if (data.currentOrderId === orderId || data.currentRideId === rideId) {
      setDriverLocation(data)
    }
  }

  const handleETAUpdate = (data: any) => {
    if (data.orderId === orderId) {
      setEta(data)
    }
  }

  const handleRideETAUpdate = (data: any) => {
    if (data.rideId === rideId) {
      setEta(data)
    }
  }

  const getBatteryLevel = (): number => {
    // Mock battery level - in a real app, you'd use the Battery API
    return Math.floor(Math.random() * 100)
  }

  const toggleTracking = () => {
    setIsTracking(!isTracking)
    
    if (!isTracking && currentLocation) {
      sendLocationUpdate(currentLocation)
    }
  }

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`
    }
    return `${distance.toFixed(1)}km`
  }

  const formatETA = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`
    }
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'delivering':
        return 'bg-blue-500'
      case 'offline':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (!session?.user?.id) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Live Location
          {isConnected ? (
            <Badge variant="default" className="ml-2">
              <Wifi className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive" className="ml-2">
              Offline
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Driver Controls */}
        {session.user.role === 'DRIVER' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="location-tracking">Location Tracking</Label>
              <Switch
                id="location-tracking"
                checked={isTracking}
                onCheckedChange={toggleTracking}
              />
            </div>
            
            {currentLocation && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  <span>
                    {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Battery className="h-4 w-4" />
                  <span>{currentLocation.batteryLevel}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Driver Location Display */}
        {driverLocation && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Driver Location</h4>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(driverLocation.isOnline ? 'online' : 'offline')}`}></div>
                <span className="text-sm text-muted-foreground">
                  {driverLocation.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>
                  {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                <span>{driverLocation.speed ? `${Math.round(driverLocation.speed)} km/h` : 'Stationary'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Battery className="h-4 w-4" />
                <span>{driverLocation.batteryLevel}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{new Date(driverLocation.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            {driverLocation.batteryLevel && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Battery Level</span>
                  <span>{driverLocation.batteryLevel}%</span>
                </div>
                <Progress value={driverLocation.batteryLevel} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* ETA Display */}
        {eta && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Estimated Arrival</h4>
              <Badge variant="outline">
                <Truck className="h-3 w-3 mr-1" />
                {formatETA(eta.etaMinutes)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Distance:</span>
                <span className="ml-2 font-medium">
                  {formatDistance(eta.distance)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">ETA:</span>
                <span className="ml-2 font-medium">
                  {new Date(eta.estimatedArrival).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Location Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            Refresh
          </Button>
          {driverLocation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = `https://maps.google.com/?q=${driverLocation.latitude},${driverLocation.longitude}`
                window.open(url, '_blank')
              }}
              className="flex-1"
            >
              View on Map
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

