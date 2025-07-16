
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const trackingUpdateSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  message: z.string().optional(),
})

interface Props {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this ride
    const ride = await prisma.ride.findFirst({
      where: {
        id: params.id,
        OR: [
          { customerId: session.user.id },
          { driver: { userId: session.user.id } }
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
        },
        tracking: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 50
        },
        fareEstimate: true,
      }
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    // Get real-time driver location if available
    let driverLocation = null
    if (ride.driver) {
      const latestLocation = await prisma.driverLocation.findFirst({
        where: {
          driverId: ride.driver.id,
          timestamp: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      })

      if (latestLocation) {
        driverLocation = {
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          heading: latestLocation.heading,
          speed: latestLocation.speed,
          timestamp: latestLocation.timestamp,
          accuracy: latestLocation.accuracy,
        }
      }
    }

    // Calculate estimated arrival time
    let estimatedArrival = null
    if (ride.status === 'ACCEPTED' && ride.driver && driverLocation) {
      // Calculate distance from driver to pickup
      const distance = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        ride.pickupLatitude,
        ride.pickupLongitude
      )
      
      const avgSpeed = 40 // km/h
      const etaMinutes = Math.ceil((distance / avgSpeed) * 60)
      estimatedArrival = new Date(Date.now() + etaMinutes * 60 * 1000)
    }

    return NextResponse.json({
      success: true,
      data: {
        ride,
        driverLocation,
        estimatedArrival,
        trackingHistory: ride.tracking,
        realTimeUpdates: true,
      }
    })

  } catch (error) {
    console.error('Error fetching ride tracking:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ride tracking' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = trackingUpdateSchema.parse(body)

    // Check if user is the driver of this ride
    const ride = await prisma.ride.findFirst({
      where: {
        id: params.id,
        driver: { userId: session.user.id }
      },
      include: {
        driver: true
      }
    })

    if (!ride) {
      return NextResponse.json({ 
        error: 'Ride not found or you are not the driver' 
      }, { status: 404 })
    }

    // Create tracking entry
    const trackingEntry = await prisma.rideTracking.create({
      data: {
        rideId: params.id,
        status: ride.status,
        message: validatedData.message || getDefaultMessage(ride.status),
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        timestamp: new Date(),
      }
    })

    // Update driver's current location if provided
    if (validatedData.latitude && validatedData.longitude) {
      await prisma.driver.update({
        where: { id: ride.driver!.id },
        data: {
          currentLatitude: validatedData.latitude,
          currentLongitude: validatedData.longitude,
        }
      })

      // Create driver location entry
      await prisma.driverLocation.create({
        data: {
          driverId: ride.driver!.id,
          latitude: validatedData.latitude,
          longitude: validatedData.longitude,
          timestamp: new Date(),
          isOnline: true,
          isDelivering: ride.status === 'IN_PROGRESS',
        }
      })
    }

    // TODO: Send real-time updates to customer via WebSocket

    return NextResponse.json({
      success: true,
      data: trackingEntry,
      message: 'Tracking updated successfully'
    })

  } catch (error) {
    console.error('Error updating ride tracking:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update ride tracking' },
      { status: 500 }
    )
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function getDefaultMessage(status: string): string {
  const messages = {
    'PENDING': 'Looking for a driver',
    'ACCEPTED': 'Driver is on the way',
    'DRIVER_ARRIVING': 'Driver is arriving at pickup location',
    'IN_PROGRESS': 'Ride is in progress',
    'COMPLETED': 'Ride completed',
    'CANCELLED': 'Ride cancelled'
  }
  return messages[status as keyof typeof messages] || 'Status updated'
}
