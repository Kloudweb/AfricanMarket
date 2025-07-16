
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Truck, Phone, Star, MapPin, Clock } from 'lucide-react'

interface DriverInfoCardProps {
  driver: any
}

export function DriverInfoCard({ driver }: DriverInfoCardProps) {
  const { user, vehicleType, vehicleMake, vehicleModel, vehicleColor, vehiclePlate, rating, totalDeliveries, currentLocation } = driver

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Truck className="h-5 w-5 mr-2" />
          Your Driver
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Driver Profile */}
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>
                {user?.name?.charAt(0) || 'D'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-medium">{user?.name || 'Driver'}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600">
                    {rating?.toFixed(1) || 'N/A'}
                  </span>
                </div>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-600">
                  {totalDeliveries} deliveries
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Vehicle</p>
                <p className="text-sm text-gray-600">
                  {vehicleColor} {vehicleMake} {vehicleModel}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">Plate</p>
                <Badge variant="outline" className="text-xs">
                  {vehiclePlate}
                </Badge>
              </div>
            </div>
          </div>

          {/* Current Status */}
          {currentLocation && (
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600">Online</span>
              </div>
              <span className="text-gray-400">•</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">
                  Updated {new Date(currentLocation.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {user?.phone && (
              <Button variant="outline" className="w-full" asChild>
                <a href={`tel:${user.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Driver
                </a>
              </Button>
            )}
            
            {currentLocation && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  const url = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`
                  window.open(url, '_blank')
                }}
              >
                <MapPin className="h-4 w-4 mr-2" />
                View Location
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
