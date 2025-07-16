
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { LocationTracker } from '@/lib/location-tracker'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '24h'
    const driverId = url.searchParams.get('driverId')

    let analytics
    if (driverId && (session.user.role === 'ADMIN' || session.user.id === driverId)) {
      analytics = await LocationTracker.getDriverAnalytics(driverId, timeRange)
    } else if (session.user.role === 'ADMIN') {
      analytics = await LocationTracker.getSystemAnalytics(timeRange)
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error getting location analytics:', error)
    return NextResponse.json(
      { error: 'Failed to get location analytics' },
      { status: 500 }
    )
  }
}
