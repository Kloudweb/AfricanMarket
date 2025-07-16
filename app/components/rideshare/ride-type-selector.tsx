
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Car, 
  Crown, 
  Users, 
  Clock, 
  DollarSign,
  Shield,
  Wifi,
  Snowflake,
  Baby,
  Accessibility
} from 'lucide-react'
import { RideType, FareEstimate } from '@/lib/types'

interface RideTypeSelectorProps {
  rideTypes: RideType[]
  selectedType: string
  onTypeSelect: (type: string) => void
  fareEstimate?: FareEstimate | null
  estimating?: boolean
}

export function RideTypeSelector({ 
  rideTypes, 
  selectedType, 
  onTypeSelect, 
  fareEstimate, 
  estimating 
}: RideTypeSelectorProps) {
  const getRideTypeIcon = (type: string) => {
    switch (type) {
      case 'PREMIUM':
        return <Crown className="h-5 w-5" />
      case 'SHARED':
        return <Users className="h-5 w-5" />
      default:
        return <Car className="h-5 w-5" />
    }
  }

  const getRideTypeColor = (type: string) => {
    switch (type) {
      case 'PREMIUM':
        return 'text-purple-600'
      case 'SHARED':
        return 'text-blue-600'
      default:
        return 'text-green-600'
    }
  }

  const getFeatureIcon = (feature: string) => {
    switch (feature.toLowerCase()) {
      case 'air_conditioning':
        return <Snowflake className="h-3 w-3" />
      case 'wifi':
        return <Wifi className="h-3 w-3" />
      case 'child_seat':
        return <Baby className="h-3 w-3" />
      case 'wheelchair_accessible':
        return <Accessibility className="h-3 w-3" />
      default:
        return <Shield className="h-3 w-3" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount)
  }

  const formatFeature = (feature: string) => {
    return feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (rideTypes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No ride types available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {rideTypes.map((rideType) => {
        const isSelected = selectedType === rideType.name
        const estimatedFare = fareEstimate?.totalFare
        
        return (
          <Card 
            key={rideType.id}
            className={`cursor-pointer transition-all ${
              isSelected 
                ? 'ring-2 ring-green-500 bg-green-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => onTypeSelect(rideType.name)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Ride Type Icon */}
                  <div className={`p-3 rounded-full bg-gray-100 ${getRideTypeColor(rideType.name)}`}>
                    {getRideTypeIcon(rideType.name)}
                  </div>
                  
                  {/* Ride Type Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{rideType.displayName}</h3>
                      {rideType.surgePricing && (
                        <Badge variant="outline" className="text-xs">
                          Dynamic Pricing
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {rideType.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{rideType.capacity} seats</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{rideType.estimatedWaitTime || 'N/A'}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        <span>{rideType.availableDrivers || 0} available</span>
                      </div>
                    </div>
                    
                    {/* Vehicle Types */}
                    <div className="flex items-center gap-2 mt-2">
                      {rideType.vehicleTypes.map((vehicleType) => (
                        <Badge key={vehicleType} variant="secondary" className="text-xs">
                          {vehicleType}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Features */}
                    {rideType.features && rideType.features.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        {rideType.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-1 text-xs text-gray-500">
                            {getFeatureIcon(feature)}
                            <span>{formatFeature(feature)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Pricing */}
                <div className="text-right">
                  {estimating ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner className="h-4 w-4" />
                      <span className="text-sm text-gray-500">Calculating...</span>
                    </div>
                  ) : isSelected && estimatedFare ? (
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(estimatedFare)}
                      </p>
                      <p className="text-sm text-gray-500">Estimated fare</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-semibold">
                        {formatCurrency(rideType.baseFare)}
                      </p>
                      <p className="text-sm text-gray-500">
                        + {formatCurrency(rideType.perKmRate)}/km
                      </p>
                      <p className="text-sm text-gray-500">
                        + {formatCurrency(rideType.perMinuteRate)}/min
                      </p>
                    </div>
                  )}
                  
                  {rideType.availableDrivers === 0 && (
                    <Badge variant="destructive" className="text-xs mt-2">
                      No drivers available
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Selection Indicator */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Selected</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
