
// Location tracking API
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { LocationTracker } from '@/lib/location-tracker'

export const dynamic = 'force-dynamic'

const locationTracker = new LocationTracker()

// Get driver location
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driverId')
    const latitude = parseFloat(searchParams.get('latitude') || '0')
    const longitude = parseFloat(searchParams.get('longitude') || '0')
    const radius = parseInt(searchParams.get('radius') || '10')

    if (driverId) {
      // Get specific driver location history
      const history = await locationTracker.getDriverLocationHistory(driverId, {
        limit: 100
      })
      return NextResponse.json({ history })
    } else if (latitude && longitude) {
      // Get nearby drivers
      const nearbyDrivers = await locationTracker.getNearbyDrivers(latitude, longitude, radius)
      return NextResponse.json({ nearbyDrivers })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error getting location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update driver location
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationData = await request.json()

    // Handle location update via LocationTracker (which uses WebSocket)
    await locationTracker.handleLocationUpdate({ userId: session.user.id }, locationData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

