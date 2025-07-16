
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Navigation, Battery, Wifi, WifiOff, Play, Pause } from 'lucide-react'
import { toast } from 'sonner'

interface DriverLocationTrackerProps {
  driver: any
  isOnShift: boolean
}

export function DriverLocationTracker({ driver, isOnShift }: DriverLocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false)
  const [location, setLocation] = useState<any>(null)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [updating, setUpdating] = useState(false)

  // Get battery level
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.floor(battery.level * 100))
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.floor(battery.level * 100))
        })
      })
    }
  }, [])

  // Start location tracking
  const startTracking = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }

    setUpdating(true)
    try {
      // Get initial location
      const position = await getCurrentPosition()
      
      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        isOnline: true,
        isDelivering: false,
        batteryLevel
      }

      // Update location on server
      const response = await fetch('/api/drivers/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData)
      })

      if (response.ok) {
        setLocation(locationData)
        setIsTracking(true)
        toast.success('Location tracking started')
        
        // Start periodic updates
        startPeriodicUpdates()
      } else {
        throw new Error('Failed to start location tracking')
      }
    } catch (error) {
      toast.error('Failed to start location tracking')
    } finally {
      setUpdating(false)
    }
  }

  // Stop location tracking
  const stopTracking = async () => {
    setIsTracking(false)
    setLocation(null)
    toast.info('Location tracking stopped')
  }

  // Periodic location updates
  const startPeriodicUpdates = () => {
    const interval = setInterval(async () => {
      if (!isTracking) {
        clearInterval(interval)
        return
      }

      try {
        const position = await getCurrentPosition()
        
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          isOnline: true,
          isDelivering: false,
          batteryLevel
        }

        await fetch('/api/drivers/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(locationData)
        })

        setLocation(locationData)
      } catch (error) {
        console.error('Failed to update location:', error)
      }
    }, 30000) // Update every 30 seconds

    return interval
  }

  // Get current position
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    })
  }

  // Auto-start tracking when on shift
  useEffect(() => {
    if (isOnShift && !isTracking) {
      startTracking()
    } else if (!isOnShift && isTracking) {
      stopTracking()
    }
  }, [isOnShift])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Location Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Tracking Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge 
                variant={isTracking ? 'default' : 'secondary'}
                className={isTracking ? 'bg-green-100 text-green-800' : ''}
              >
                {isTracking ? (
                  <>
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    Tracking
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 bg-gray-500 rounded-full mr-2"></div>
                    Stopped
                  </>
                )}
              </Badge>
              {isOnShift && !isTracking && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  Auto-start pending
                </Badge>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={isTracking ? stopTracking : startTracking}
              disabled={updating}
            >
              {isTracking ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
          </div>

          {/* Location Info */}
          {location && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Latitude</p>
                  <p className="text-gray-600">{location.latitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Longitude</p>
                  <p className="text-gray-600">{location.longitude.toFixed(6)}</p>
                </div>
              </div>

              {location.speed && (
                <div className="text-sm">
                  <p className="font-medium text-gray-700">Speed</p>
                  <p className="text-gray-600">{Math.round(location.speed * 3.6)} km/h</p>
                </div>
              )}

              {location.accuracy && (
                <div className="text-sm">
                  <p className="font-medium text-gray-700">Accuracy</p>
                  <p className="text-gray-600">±{Math.round(location.accuracy)}m</p>
                </div>
              )}
            </div>
          )}

          {/* Device Status */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                {navigator.onLine ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-gray-600">
                  {navigator.onLine ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {batteryLevel !== null && (
                <div className="flex items-center space-x-1">
                  <Battery className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">{batteryLevel}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Map Button */}
          {location && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                window.open(url, '_blank')
              }}
            >
              <Navigation className="h-4 w-4 mr-2" />
              View on Map
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
