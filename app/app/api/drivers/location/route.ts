
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Update driver location
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { latitude, longitude, heading, speed, accuracy, isOnline, isDelivering, currentOrderId, batteryLevel } = await req.json()

    // Check if user is a driver
    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Update driver's current location in driver table
    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        isAvailable: isOnline && !isDelivering
      }
    })

    // Create location tracking entry
    await prisma.driverLocation.create({
      data: {
        driverId: driver.id,
        latitude,
        longitude,
        heading,
        speed,
        accuracy,
        isOnline,
        isDelivering,
        currentOrderId,
        batteryLevel
      }
    })

    // Clean up old location records (keep only last 100 per driver)
    const oldLocations = await prisma.driverLocation.findMany({
      where: { driverId: driver.id },
      orderBy: { timestamp: 'desc' },
      skip: 100
    })

    if (oldLocations.length > 0) {
      await prisma.driverLocation.deleteMany({
        where: {
          id: {
            in: oldLocations.map(loc => loc.id)
          }
        }
      })
    }

    return NextResponse.json({
      message: 'Location updated successfully',
      location: {
        latitude,
        longitude,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error updating driver location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get driver location
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const driverId = searchParams.get('driverId')

    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 })
    }

    const location = await prisma.driverLocation.findFirst({
      where: {
        driverId,
        isOnline: true
      },
      orderBy: { timestamp: 'desc' }
    })

    if (!location) {
      return NextResponse.json({ error: 'Driver location not found' }, { status: 404 })
    }

    return NextResponse.json({
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed: location.speed,
        timestamp: location.timestamp,
        isDelivering: location.isDelivering
      }
    })
  } catch (error) {
    console.error('Error fetching driver location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
