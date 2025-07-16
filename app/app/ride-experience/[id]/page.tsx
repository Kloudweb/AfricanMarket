
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import RideExperienceDashboard from '@/components/ride-experience/ride-experience-dashboard'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  params: { id: string }
}

async function getRideData(rideId: string, userId: string) {
  try {
    const ride = await prisma.ride.findFirst({
      where: {
        id: rideId,
        OR: [
          { customerId: userId },
          { driver: { userId: userId } }
        ]
      },
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
            totalRides: true,
            currentLatitude: true,
            currentLongitude: true,
          }
        }
      }
    })

    return ride
  } catch (error) {
    console.error('Error fetching ride data:', error)
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

export default async function RideExperiencePage({ params }: Props) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const ride = await getRideData(params.id, session.user.id)
  
  if (!ride) {
    return (
      <div className="container mx-auto p-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Ride Not Found</h1>
              <p className="text-gray-600 mb-6">
                The ride you're looking for doesn't exist or you don't have access to it.
              </p>
              <a 
                href="/rideshare"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Rideshare
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if ride is in a state where ride experience features should be available
  const activeStatuses = ['ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS', 'COMPLETED']
  if (!activeStatuses.includes(ride.status)) {
    return (
      <div className="container mx-auto p-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Ride Experience Not Available</h1>
              <p className="text-gray-600 mb-6">
                The ride experience features are only available for active rides.
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                Current Status: {ride.status}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ride Experience</h1>
        <p className="text-gray-600">
          Real-time communication and tracking for your ride
        </p>
      </div>
      
      <Suspense fallback={<LoadingSpinner />}>
        <RideExperienceDashboard rideId={params.id} />
      </Suspense>
    </div>
  )
}

export const dynamic = 'force-dynamic'
