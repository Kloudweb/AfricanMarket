
'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Navigation, Truck, Home } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface OrderTrackingMapProps {
  orderId: string
  vendor: any
  driver: any
  deliveryLocation: {
    latitude: number
    longitude: number
    address: string
  }
}

export function OrderTrackingMap({ orderId, vendor, driver, deliveryLocation }: OrderTrackingMapProps) {
  const [driverLocation, setDriverLocation] = useState<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [routeInfo, setRouteInfo] = useState<any>(null)

  // Fetch driver location
  const fetchDriverLocation = useCallback(async () => {
    if (!driver?.id) return

    try {
      const response = await fetch(`/api/drivers/location?driverId=${driver.id}`)
      if (response.ok) {
        const data = await response.json()
        setDriverLocation(data.location)
      }
    } catch (error) {
      console.error('Error fetching driver location:', error)
    }
  }, [driver?.id])

  // Set up real-time location updates
  useEffect(() => {
    if (!driver?.id) return

    fetchDriverLocation()
    
    // Update location every 15 seconds
    const interval = setInterval(fetchDriverLocation, 15000)
    
    return () => clearInterval(interval)
  }, [driver?.id, fetchDriverLocation])

  // Initialize map (using a placeholder for now)
  useEffect(() => {
    // In a real implementation, you would initialize Google Maps here
    setMapLoaded(true)
  }, [])

  // Calculate estimated arrival time
  const calculateETA = () => {
    if (!driverLocation || !deliveryLocation) return null

    // Simple ETA calculation (in a real app, use Google Maps API)
    const distance = calculateDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      deliveryLocation.latitude,
      deliveryLocation.longitude
    )

    const averageSpeed = 30 // km/h
    const eta = Math.ceil((distance / averageSpeed) * 60) // minutes

    return eta
  }

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const eta = calculateETA()

  if (!mapLoaded) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map Placeholder */}
      <div className="h-64 bg-gray-100 rounded-lg relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Interactive Map</p>
            <p className="text-xs text-gray-500 mt-1">
              Real-time tracking coming soon
            </p>
          </div>
        </div>

        {/* Map markers simulation */}
        {vendor && (
          <div className="absolute top-4 left-4 bg-white rounded-lg p-2 shadow-md">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <span className="text-xs font-medium">Restaurant</span>
            </div>
          </div>
        )}

        {driverLocation && (
          <div className="absolute top-4 right-4 bg-white rounded-lg p-2 shadow-md">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium">Driver</span>
            </div>
          </div>
        )}

        {deliveryLocation && (
          <div className="absolute bottom-4 left-4 bg-white rounded-lg p-2 shadow-md">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 bg-red-500 rounded-full"></div>
              <span className="text-xs font-medium">Delivery</span>
            </div>
          </div>
        )}
      </div>

      {/* Location Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Restaurant Location */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <Home className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">Pickup Location</h4>
                <p className="text-xs text-gray-600 mt-1">
                  {vendor?.businessName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {vendor?.address}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Location */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <MapPin className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">Delivery Location</h4>
                <p className="text-xs text-gray-600 mt-1">
                  {deliveryLocation.address}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Driver Information */}
      {driver && driverLocation && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">Driver Location</h4>
                  <p className="text-sm text-gray-600">
                    {driver.user?.name} • {driver.vehicleType}
                  </p>
                  <p className="text-xs text-gray-500">
                    Last updated: {new Date(driverLocation.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              
              {eta && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  ETA: {eta} min
                </Badge>
              )}
            </div>
            
            {driverLocation.speed && (
              <div className="mt-3 text-xs text-gray-500">
                Speed: {Math.round(driverLocation.speed)} km/h
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Button */}
      {deliveryLocation && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${deliveryLocation.latitude},${deliveryLocation.longitude}`
            window.open(url, '_blank')
          }}
        >
          <Navigation className="h-4 w-4 mr-2" />
          Get Directions
        </Button>
      )}
    </div>
  )
}
