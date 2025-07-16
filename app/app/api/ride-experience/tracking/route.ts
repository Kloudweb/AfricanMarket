
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TripTrackingService } from '@/lib/trip-tracking-service'
import { RealTimeService } from '@/lib/real-time-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateLocationSchema = z.object({
  rideId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  heading: z.number().optional(),
  speed: z.number().optional(),
  altitude: z.number().optional(),
  accuracy: z.number().optional(),
  tripStatus: z.enum(['PENDING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'PASSENGER_PICKED_UP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  distanceTraveled: z.number().optional(),
  timeElapsed: z.number().optional(),
  currentAddress: z.string().optional(),
  nextWaypoint: z.string().optional(),
  distanceToDestination: z.number().optional(),
  batteryLevel: z.number().optional(),
  connectionType: z.string().optional(),
  signalStrength: z.number().optional(),
  metadata: z.any().optional(),
})

// Update trip location
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateLocationSchema.parse(body)

    // Get user's driver profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { driverProfile: true }
    })

    if (!user?.driverProfile) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const trackingData = await TripTrackingService.updateTripLocation({
      ...validatedData,
      driverId: user.driverProfile.id,
    })

    // Send real-time location update
    RealTimeService.sendLocationUpdate(validatedData.rideId, {
      ...validatedData,
      timestamp: new Date(),
    })

    return NextResponse.json({
      success: true,
      data: trackingData
    })

  } catch (error) {
    console.error('Error updating trip location:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

// Get trip tracking data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rideId = searchParams.get('rideId')

    if (!rideId) {
      return NextResponse.json({ error: 'rideId is required' }, { status: 400 })
    }

    const trackingData = await TripTrackingService.getTripTracking(rideId, session.user.id)

    return NextResponse.json({
      success: true,
      data: trackingData
    })

  } catch (error) {
    console.error('Error getting trip tracking:', error)
    return NextResponse.json(
      { error: 'Failed to get trip tracking' },
      { status: 500 }
    )
  }
}
