
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  MapPin, 
  Clock, 
  Car, 
  Route, 
  Shield, 
  Navigation,
  Phone,
  Star
} from 'lucide-react'
import { format } from 'date-fns'
import { prisma } from '@/lib/db'

interface Props {
  params: { token: string }
}

async function getSharedTripData(token: string) {
  try {
    const tripShare = await prisma.tripShare.findFirst({
      where: { 
        shareToken: token,
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        ride: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                avatar: true,
              }
            },
            driver: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    avatar: true,
                  }
                },
                vehicleType: true,
                vehicleMake: true,
                vehicleModel: true,
                vehicleColor: true,
                vehiclePlate: true,
                rating: true,
                currentLatitude: true,
                currentLongitude: true,
              }
            }
          }
        }
      }
    })

    if (!tripShare) {
      return null
    }

    // Get latest tracking if location sharing is enabled
    let latestTracking = null
    if (tripShare.shareLocation) {
      latestTracking = await prisma.tripTracking.findFirst({
        where: { rideId: tripShare.rideId },
        orderBy: { timestamp: 'desc' },
      })
    }

    // Get ETA if ETA sharing is enabled
    let latestETA = null
    if (tripShare.shareETA) {
      latestETA = await prisma.tripETA.findFirst({
        where: { rideId: tripShare.rideId },
        orderBy: { createdAt: 'desc' },
      })
    }

    return {
      tripShare,
      latestTracking,
      latestETA,
    }
  } catch (error) {
    console.error('Error fetching shared trip data:', error)
    return null
  }
}

function LoadingSpinner() {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function SharedTripPage({ params }: Props) {
  const data = await getSharedTripData(params.token)
  
  if (!data) {
    return (
      <div className="container mx-auto p-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="p-8">
            <div className="text-center">
              <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Trip Not Found</h1>
              <p className="text-gray-600 mb-6">
                This trip share link is invalid, expired, or has been cancelled.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { tripShare, latestTracking, latestETA } = data
  const { ride } = tripShare

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

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shared Trip</h1>
        <p className="text-gray-600">
          {ride.customer.name} has shared their ride with you
        </p>
      </div>

      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Trip Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Trip Status
              </CardTitle>
              <Badge className={getStatusColor(ride.status)}>
                {ride.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <span className="text-sm">From: {ride.pickupAddress}</span>
              </div>
              <Route className="h-4 w-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span className="text-sm">To: {ride.destinationAddress}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Location */}
        {tripShare.shareLocation && latestTracking && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Live Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">
                      {latestTracking.currentAddress || 'Getting location...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      Speed: {latestTracking.speed?.toFixed(0) || 0} km/h
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">
                      Last update: {format(new Date(latestTracking.timestamp), 'HH:mm')}
                    </span>
                  </div>
                  {latestTracking.distanceToDestination && (
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">
                        {latestTracking.distanceToDestination.toFixed(1)} km remaining
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ETA Information */}
        {tripShare.shareETA && latestETA && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Estimated Arrival
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatETA(latestETA.estimatedArrival.toString())}
                  </p>
                  <p className="text-sm text-gray-600">
                    {latestETA.distanceRemaining.toFixed(1)} km remaining
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

        {/* Driver Information */}
        {tripShare.shareDriver && ride.driver && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Driver Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={ride.driver.user.avatar || undefined} />
                  <AvatarFallback>
                    {ride.driver.user.name?.charAt(0) || 'D'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{ride.driver.user.name}</h3>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {ride.driver.rating?.toFixed(1) || 'N/A'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {ride.driver.vehicleColor} {ride.driver.vehicleMake} {ride.driver.vehicleModel}
                  </p>
                  <p className="text-sm text-gray-600">
                    License Plate: {ride.driver.vehiclePlate}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Shared By */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Shared By
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={ride.customer.avatar || undefined} />
                <AvatarFallback>
                  {ride.customer.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h3 className="font-semibold">{ride.customer.name}</h3>
                <p className="text-sm text-gray-600">
                  Shared on {format(new Date(tripShare.createdAt), 'PPp')}
                </p>
                {tripShare.expiresAt && (
                  <p className="text-sm text-gray-600">
                    Expires on {format(new Date(tripShare.expiresAt), 'PPp')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Contact Name:</strong> {tripShare.contactName || 'N/A'}
              </p>
              {tripShare.contactPhone && (
                <p className="text-sm text-gray-600">
                  <strong>Phone:</strong> {tripShare.contactPhone || 'N/A'}
                </p>
              )}
              {tripShare.contactEmail && (
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {tripShare.contactEmail || 'N/A'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
