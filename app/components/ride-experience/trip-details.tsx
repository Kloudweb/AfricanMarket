
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  MapPin, 
  Clock, 
  Car, 
  CreditCard, 
  Route, 
  Star,
  Phone,
  MessageCircle,
  Navigation,
  DollarSign,
  FileText,
  Download,
  Share2,
  Calendar,
  User
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TripDetailsProps {
  rideId: string
  onChat?: () => void
  onCall?: () => void
  onShareTrip?: () => void
}

interface RideDetails {
  id: string
  rideNumber: string
  status: string
  rideType: string
  pickupAddress: string
  destinationAddress: string
  distance?: number
  estimatedDuration?: number
  actualDuration?: number
  estimatedFare?: number
  actualFare?: number
  baseFare?: number
  distanceFare?: number
  timeFare?: number
  surgeFare?: number
  surgeMultiplier?: number
  paymentStatus: string
  paymentMethod?: string
  notes?: string
  passengers: number
  isScheduled: boolean
  scheduledFor?: string
  requestedAt: string
  acceptedAt?: string
  startedAt?: string
  completedAt?: string
  cancelledAt?: string
  customer: {
    id: string
    name: string
    phone: string
    avatar?: string
  }
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
  }
  review?: {
    rating: number
    comment?: string
  }
}

export default function TripDetails({ rideId, onChat, onCall, onShareTrip }: TripDetailsProps) {
  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRideDetails()
  }, [rideId])

  const fetchRideDetails = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/rideshare/${rideId}`)
      const data = await response.json()
      
      if (data.success) {
        setRideDetails(data.data)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch ride details')
      }
    } catch (error) {
      console.error('Error fetching ride details:', error)
      setError('Failed to fetch ride details')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-800'
      case 'DRIVER_ARRIVING':
        return 'bg-orange-100 text-orange-800'
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'REFUNDED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const generateReceipt = () => {
    if (!rideDetails) return
    
    const receiptData = {
      rideNumber: rideDetails.rideNumber,
      date: format(new Date(rideDetails.requestedAt), 'PPp'),
      from: rideDetails.pickupAddress,
      to: rideDetails.destinationAddress,
      distance: rideDetails.distance,
      duration: rideDetails.actualDuration || rideDetails.estimatedDuration,
      fare: rideDetails.actualFare || rideDetails.estimatedFare,
      driver: rideDetails.driver?.user.name,
      vehicle: `${rideDetails.driver?.vehicleColor} ${rideDetails.driver?.vehicleMake} ${rideDetails.driver?.vehicleModel}`,
      plate: rideDetails.driver?.vehiclePlate,
    }
    
    // This would generate a PDF receipt in a real app
    toast.success('Receipt generated successfully')
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

  if (error || !rideDetails) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p>{error || 'Failed to load trip details'}</p>
            <Button 
              variant="outline" 
              onClick={fetchRideDetails}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Trip Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Trip #{rideDetails.rideNumber}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStatusColor(rideDetails.status)}>
                  {rideDetails.status}
                </Badge>
                <Badge variant="outline">{rideDetails.rideType}</Badge>
                {rideDetails.isScheduled && (
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    Scheduled
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onChat}>
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onCall}>
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onShareTrip}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Route Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Route Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Pickup</p>
                <p className="text-sm text-gray-600">{rideDetails.pickupAddress}</p>
                {rideDetails.acceptedAt && (
                  <p className="text-xs text-gray-500">
                    Accepted at {format(new Date(rideDetails.acceptedAt), 'HH:mm')}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 pl-6">
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {rideDetails.distance && (
                  <div className="flex items-center gap-1">
                    <Navigation className="h-4 w-4" />
                    <span>{rideDetails.distance.toFixed(1)} km</span>
                  </div>
                )}
                {(rideDetails.actualDuration || rideDetails.estimatedDuration) && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatDuration(rideDetails.actualDuration || rideDetails.estimatedDuration!)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Destination</p>
                <p className="text-sm text-gray-600">{rideDetails.destinationAddress}</p>
                {rideDetails.completedAt && (
                  <p className="text-xs text-gray-500">
                    Completed at {format(new Date(rideDetails.completedAt), 'HH:mm')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Driver Information */}
      {rideDetails.driver && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Driver Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={rideDetails.driver.user.avatar} />
                <AvatarFallback>
                  {rideDetails.driver.user.name?.charAt(0) || 'D'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{rideDetails.driver.user.name}</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {rideDetails.driver.rating.toFixed(1)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {rideDetails.driver.totalRides} rides completed
                </p>
                <p className="text-sm text-gray-600">
                  {rideDetails.driver.vehicleColor} {rideDetails.driver.vehicleMake} {rideDetails.driver.vehicleModel}
                </p>
                <p className="text-sm text-gray-600">
                  License Plate: {rideDetails.driver.vehiclePlate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fare Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fare Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rideDetails.baseFare && (
              <div className="flex justify-between">
                <span>Base Fare</span>
                <span>${rideDetails.baseFare.toFixed(2)}</span>
              </div>
            )}
            {rideDetails.distanceFare && (
              <div className="flex justify-between">
                <span>Distance Fare</span>
                <span>${rideDetails.distanceFare.toFixed(2)}</span>
              </div>
            )}
            {rideDetails.timeFare && (
              <div className="flex justify-between">
                <span>Time Fare</span>
                <span>${rideDetails.timeFare.toFixed(2)}</span>
              </div>
            )}
            {rideDetails.surgeFare && rideDetails.surgeFare > 0 && (
              <div className="flex justify-between">
                <span>
                  Surge Fare ({rideDetails.surgeMultiplier}x)
                </span>
                <span>${rideDetails.surgeFare.toFixed(2)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between font-semibold text-lg">
              <span>Total Fare</span>
              <span>${(rideDetails.actualFare || rideDetails.estimatedFare || 0).toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">
                  {rideDetails.paymentMethod || 'Credit Card'}
                </span>
              </div>
              <Badge className={getPaymentStatusColor(rideDetails.paymentStatus)}>
                {rideDetails.paymentStatus}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trip Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Trip Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <p className="font-medium">Trip Requested</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(rideDetails.requestedAt), 'PPp')}
                </p>
              </div>
            </div>
            
            {rideDetails.acceptedAt && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Driver Assigned</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(rideDetails.acceptedAt), 'PPp')}
                  </p>
                </div>
              </div>
            )}
            
            {rideDetails.startedAt && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Trip Started</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(rideDetails.startedAt), 'PPp')}
                  </p>
                </div>
              </div>
            )}
            
            {rideDetails.completedAt && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Trip Completed</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(rideDetails.completedAt), 'PPp')}
                  </p>
                </div>
              </div>
            )}
            
            {rideDetails.cancelledAt && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Trip Cancelled</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(rideDetails.cancelledAt), 'PPp')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Special Instructions */}
      {rideDetails.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Special Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{rideDetails.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Review */}
      {rideDetails.review && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Your Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-4 w-4',
                      i < rideDetails.review!.rating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    )}
                  />
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {rideDetails.review.rating}/5
                </span>
              </div>
              {rideDetails.review.comment && (
                <p className="text-sm text-gray-700">{rideDetails.review.comment}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generateReceipt} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
            <Button variant="outline" onClick={onShareTrip} className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              Share Trip
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
