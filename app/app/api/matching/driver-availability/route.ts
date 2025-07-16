
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { matchingService } from '@/lib/matching-service'
import { prisma } from '@/lib/db'
import { DriverAvailabilityStatusType } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Update driver availability status
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { status, reason, location, batteryLevel, connectionStrength, appVersion, metadata } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Validate status
    const validStatuses: DriverAvailabilityStatusType[] = [
      'ONLINE', 'OFFLINE', 'BUSY', 'AVAILABLE', 'BREAK', 'EMERGENCY', 'MAINTENANCE'
    ]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get driver profile
    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Update availability
    await matchingService.updateDriverAvailability(
      driver.id,
      status,
      location,
      {
        reason,
        batteryLevel,
        connectionStrength,
        appVersion,
        ...metadata
      }
    )

    // Update performance metrics
    await matchingService.updateDriverPerformanceMetrics(driver.id)

    return NextResponse.json({
      success: true,
      message: 'Driver availability updated successfully',
      status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating driver availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get driver availability status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      include: {
        availabilityStatus: {
          where: { endTime: null },
          orderBy: { startTime: 'desc' },
          take: 1
        }
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const currentStatus = driver.availabilityStatus[0]

    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        isAvailable: driver.isAvailable,
        rating: driver.rating,
        totalDeliveries: driver.totalDeliveries,
        totalRides: driver.totalRides
      },
      availability: currentStatus || null,
      onlineTime: currentStatus ? 
        Math.floor((Date.now() - currentStatus.startTime.getTime()) / 1000 / 60) : 0
    })
  } catch (error) {
    console.error('Error getting driver availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
