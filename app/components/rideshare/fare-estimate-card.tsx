
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  DollarSign, 
  Clock, 
  Route, 
  TrendingUp,
  Info,
  AlertTriangle
} from 'lucide-react'
import { FareEstimate } from '@/lib/types'

interface FareEstimateCardProps {
  estimate: FareEstimate
  rideType: string
  loading?: boolean
}

export function FareEstimateCard({ estimate, rideType, loading }: FareEstimateCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <LoadingSpinner className="h-4 w-4" />
            <span className="text-sm text-gray-600">Calculating fare...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!estimate) {
    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount)
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fare Estimate
          </span>
          <Badge variant={estimate.surgeMultiplier > 1 ? "destructive" : "secondary"}>
            {rideType}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Fare */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(estimate.totalFare)}
          </p>
          <p className="text-sm text-gray-600">Total Estimated Fare</p>
        </div>

        {/* Trip Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-blue-600">
              <Route className="h-4 w-4" />
              <span className="text-sm font-medium">Distance</span>
            </div>
            <p className="text-lg font-semibold mt-1">
              {estimate.breakdown.estimatedDistance}
            </p>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-purple-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Duration</span>
            </div>
            <p className="text-lg font-semibold mt-1">
              {estimate.breakdown.estimatedTime}
            </p>
          </div>
        </div>

        {/* Fare Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Fare Breakdown</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Base fare</span>
              <span className="text-sm font-medium">
                {formatCurrency(estimate.baseFare)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Distance ({estimate.breakdown.distance} km)
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(estimate.distanceFare)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Time ({estimate.breakdown.duration} min)
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(estimate.timeFare)}
              </span>
            </div>
            
            {estimate.surgeFare && estimate.surgeFare > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Surge pricing ({estimate.surgeMultiplier}x)
                </span>
                <span className="text-sm font-medium text-red-600">
                  {formatCurrency(estimate.surgeFare)}
                </span>
              </div>
            )}
          </div>

          <div className="border-t pt-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total</span>
              <span className="font-bold text-green-600">
                {formatCurrency(estimate.totalFare)}
              </span>
            </div>
          </div>
        </div>

        {/* Surge Pricing Alert */}
        {estimate.surgeMultiplier > 1 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Surge Pricing Active
                </p>
                <p className="text-sm text-yellow-700">
                  Due to high demand, prices are {estimate.surgeMultiplier}x higher than normal.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Peak Hours Info */}
        {estimate.peakHours && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Peak Hours
                </p>
                <p className="text-sm text-blue-700">
                  You're booking during peak hours, which may affect pricing and availability.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Validity */}
        <div className="text-xs text-gray-500 text-center">
          <p>
            This estimate is valid until {new Date(estimate.validUntil).toLocaleTimeString()}
          </p>
          <p>Final fare may vary based on actual route and traffic conditions</p>
        </div>
      </CardContent>
    </Card>
  )
}
