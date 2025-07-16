
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const respondToRideSchema = z.object({
  rideRequestId: z.string().min(1, 'Ride request ID is required'),
  response: z.enum(['ACCEPTED', 'DECLINED']),
  estimatedArrival: z.number().min(1).max(60).optional(),
  notes: z.string().optional(),
})

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = respondToRideSchema.parse(body)

    // Check if user is a driver
    const driver = await prisma.driver.findFirst({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    // Check if ride request exists and is valid
    const rideRequest = await prisma.rideRequest.findFirst({
      where: {
        id: validatedData.rideRequestId,
        expiresAt: { gt: new Date() }
      },
      include: {
        ride: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
              }
            }
          }
        }
      }
    })

    if (!rideRequest) {
      return NextResponse.json({ 
        error: 'Ride request not found or expired' 
      }, { status: 404 })
    }

    // Check if ride is still available
    if (rideRequest.ride.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Ride is no longer available' 
      }, { status: 400 })
    }

    // Check if driver already responded
    const existingResponse = await prisma.driverResponse.findFirst({
      where: {
        rideRequestId: validatedData.rideRequestId,
        driverId: driver.id
      }
    })

    if (existingResponse) {
      return NextResponse.json({ 
        error: 'You have already responded to this ride request' 
      }, { status: 400 })
    }

    // Calculate distance to pickup
    const distanceToPickup = calculateDistance(
      driver.currentLatitude || 0,
      driver.currentLongitude || 0,
      rideRequest.pickupLatitude,
      rideRequest.pickupLongitude
    )

    // Create driver response
    const driverResponse = await prisma.driverResponse.create({
      data: {
        rideRequestId: validatedData.rideRequestId,
        driverId: driver.id,
        response: validatedData.response,
        estimatedArrival: validatedData.estimatedArrival,
        notes: validatedData.notes,
        driverLatitude: driver.currentLatitude,
        driverLongitude: driver.currentLongitude,
        distanceToPickup,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes for customer to respond
      }
    })

    // If driver accepted, update ride status and assign driver
    if (validatedData.response === 'ACCEPTED') {
      const updatedRide = await prisma.ride.update({
        where: { id: rideRequest.ride.id },
        data: {
          status: 'ACCEPTED',
          driverId: driver.id,
          acceptedAt: new Date()
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
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

      // Create ride tracking entry
      await prisma.rideTracking.create({
        data: {
          rideId: rideRequest.ride.id,
          status: 'ACCEPTED',
          message: 'Driver accepted ride and is on the way',
          timestamp: new Date(),
          latitude: driver.currentLatitude,
          longitude: driver.currentLongitude,
        }
      })

      // Update driver availability
      await prisma.driver.update({
        where: { id: driver.id },
        data: { isAvailable: false }
      })

      // TODO: Send notification to customer
      // TODO: Send notifications to other drivers that ride is no longer available

      return NextResponse.json({
        success: true,
        data: {
          response: driverResponse,
          ride: updatedRide,
          message: 'Ride accepted successfully'
        }
      })
    } else {
      // Driver declined
      return NextResponse.json({
        success: true,
        data: {
          response: driverResponse,
          message: 'Response recorded'
        }
      })
    }

  } catch (error) {
    console.error('Error responding to ride:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to respond to ride' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a driver
    const driver = await prisma.driver.findFirst({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get available ride requests near the driver
    const rideRequests = await prisma.rideRequest.findMany({
      where: {
        expiresAt: { gt: new Date() },
        ride: {
          status: 'PENDING',
          driverId: null
        },
        NOT: {
          driverResponses: {
            some: {
              driverId: driver.id
            }
          }
        }
      },
      include: {
        ride: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                avatar: true,
              }
            }
          }
        },
        driverResponses: {
          select: {
            driverId: true,
            response: true,
            respondedAt: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit,
    })

    // Calculate distance and filter by driver preferences
    const driverPreferences = await prisma.driverPreference.findFirst({
      where: { driverId: driver.id }
    })

    const filteredRequests = rideRequests
      .map(request => {
        const distance = calculateDistance(
          driver.currentLatitude || 0,
          driver.currentLongitude || 0,
          request.pickupLatitude,
          request.pickupLongitude
        )

        return {
          ...request,
          distanceToPickup: Math.round(distance * 100) / 100,
          estimatedArrival: Math.ceil(distance / 40 * 60), // 40 km/h average speed
        }
      })
      .filter(request => {
        // Filter by max distance preference
        if (driverPreferences?.maxDistance && request.distanceToPickup > driverPreferences.maxDistance) {
          return false
        }

        // Filter by ride type preference
        if (driverPreferences?.rideTypes && !driverPreferences.rideTypes.includes(request.rideType)) {
          return false
        }

        return true
      })
      .sort((a, b) => a.distanceToPickup - b.distanceToPickup)

    return NextResponse.json({
      success: true,
      data: {
        requests: filteredRequests,
        total: filteredRequests.length,
        driverLocation: {
          latitude: driver.currentLatitude,
          longitude: driver.currentLongitude,
        },
        preferences: driverPreferences,
      }
    })

  } catch (error) {
    console.error('Error fetching ride requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ride requests' },
      { status: 500 }
    )
  }
}
