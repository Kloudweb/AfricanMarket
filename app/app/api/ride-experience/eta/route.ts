
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TripTrackingService } from '@/lib/trip-tracking-service'
import { RealTimeService } from '@/lib/real-time-service'
import { NotificationService } from '@/lib/notification-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const calculateETASchema = z.object({
  rideId: z.string(),
  currentLatitude: z.number(),
  currentLongitude: z.number(),
  destinationLatitude: z.number(),
  destinationLongitude: z.number(),
  currentSpeed: z.number().optional(),
  trafficCondition: z.enum(['LIGHT', 'MODERATE', 'HEAVY', 'SEVERE']).optional(),
  weatherCondition: z.enum(['CLEAR', 'RAIN', 'SNOW', 'FOG']).optional(),
})

// Calculate ETA
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = calculateETASchema.parse(body)

    // Verify user has access to this ride
    const ride = await prisma.ride.findFirst({
      where: {
        id: validatedData.rideId,
        OR: [
          { customerId: session.user.id },
          { driver: { userId: session.user.id } }
        ]
      }
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found or unauthorized' }, { status: 404 })
    }

    const etaData = await TripTrackingService.calculateETA(validatedData)

    // Send real-time ETA update
    RealTimeService.sendETAUpdate(validatedData.rideId, etaData)

    // Send notification if ETA changed significantly
    const previousETA = await prisma.tripETA.findFirst({
      where: { rideId: validatedData.rideId },
      orderBy: { createdAt: 'desc' },
      skip: 1, // Skip the one we just created
    })

    if (previousETA && etaData.etaRecord.originalETA) {
      const timeDiff = Math.abs(
        new Date(etaData.estimatedArrival).getTime() - 
        new Date(previousETA.estimatedArrival).getTime()
      ) / 1000 / 60 // Convert to minutes

      if (timeDiff > 5) { // 5 minutes threshold
        await NotificationService.sendETAUpdateNotification(validatedData.rideId, etaData)
      }
    }

    return NextResponse.json({
      success: true,
      data: etaData
    })

  } catch (error) {
    console.error('Error calculating ETA:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to calculate ETA' },
      { status: 500 }
    )
  }
}

// Get ETA history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rideId = searchParams.get('rideId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!rideId) {
      return NextResponse.json({ error: 'rideId is required' }, { status: 400 })
    }

    // Verify user has access to this ride
    const ride = await prisma.ride.findFirst({
      where: {
        id: rideId,
        OR: [
          { customerId: session.user.id },
          { driver: { userId: session.user.id } }
        ]
      }
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found or unauthorized' }, { status: 404 })
    }

    const etaHistory = await prisma.tripETA.findMany({
      where: { rideId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      success: true,
      data: etaHistory
    })

  } catch (error) {
    console.error('Error getting ETA history:', error)
    return NextResponse.json(
      { error: 'Failed to get ETA history' },
      { status: 500 }
    )
  }
}
