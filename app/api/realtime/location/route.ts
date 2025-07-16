
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { LocationTracker } from '@/lib/location-tracker'
import { authOptions } from '@/lib/auth'

const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  orderId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const locationData = locationUpdateSchema.parse(body)

    const result = await LocationTracker.updateLocation(
      session.user.id,
      locationData.latitude,
      locationData.longitude,
      {
        accuracy: locationData.accuracy,
        heading: locationData.heading,
        speed: locationData.speed,
        orderId: locationData.orderId
      }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
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

    const url = new URL(request.url)
    const driverId = url.searchParams.get('driverId')
    const orderId = url.searchParams.get('orderId')

    if (driverId) {
      const location = await LocationTracker.getDriverLocation(driverId)
      return NextResponse.json(location)
    } else if (orderId) {
      const location = await LocationTracker.getOrderLocation(orderId)
      return NextResponse.json(location)
    } else {
      return NextResponse.json({ error: 'Missing driverId or orderId' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error getting location:', error)
    return NextResponse.json(
      { error: 'Failed to get location' },
      { status: 500 }
    )
  }
}
