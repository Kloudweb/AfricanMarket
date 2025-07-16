
// Location analytics API
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { LocationTracker } from '@/lib/location-tracker'

export const dynamic = 'force-dynamic'

const locationTracker = new LocationTracker()

// Get location analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driverId') || session.user.id
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(Date.now() - 24 * 60 * 60 * 1000)
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date()

    const analytics = await locationTracker.getLocationAnalytics(driverId, startDate, endDate)

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Error getting location analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

