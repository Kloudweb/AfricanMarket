
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TripTrackingService } from '@/lib/trip-tracking-service'

export const dynamic = 'force-dynamic'

// Get trip tracking history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rideId = searchParams.get('rideId')
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!rideId) {
      return NextResponse.json({ error: 'rideId is required' }, { status: 400 })
    }

    const history = await TripTrackingService.getTripTrackingHistory(rideId, session.user.id, limit)

    return NextResponse.json({
      success: true,
      data: history
    })

  } catch (error) {
    console.error('Error getting trip tracking history:', error)
    return NextResponse.json(
      { error: 'Failed to get trip tracking history' },
      { status: 500 }
    )
  }
}
