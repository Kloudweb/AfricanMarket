
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TripTrackingService } from '@/lib/trip-tracking-service'

export const dynamic = 'force-dynamic'

// Get trip analytics
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

    const analytics = await TripTrackingService.getTripAnalytics(rideId)

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('Error getting trip analytics:', error)
    return NextResponse.json(
      { error: 'Failed to get trip analytics' },
      { status: 500 }
    )
  }
}
