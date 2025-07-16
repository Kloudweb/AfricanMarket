

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Update driver availability
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      mode, 
      location, 
      reason, 
      batteryLevel, 
      networkQuality,
      scheduleEndTime 
    } = await req.json()

    // Validate mode
    const validModes = ['ONLINE', 'OFFLINE', 'BREAK', 'MAINTENANCE']
    if (!validModes.includes(mode)) {
      return NextResponse.json({ error: 'Invalid availability mode' }, { status: 400 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      include: { driverSettings: true }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Check if driver is currently delivering
    const activeOrder = await prisma.order.findFirst({
      where: {
        driverId: driver.id,
        status: { in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] }
      }
    })

    if (activeOrder && mode === 'OFFLINE') {
      return NextResponse.json({ 
        error: 'Cannot go offline while delivering an order' 
      }, { status: 400 })
    }

    // Store previous mode for history
    const previousMode = driver.availabilityMode

    // Update driver availability
    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        availabilityMode: mode,
        isAvailable: mode === 'ONLINE',
        lastAvailabilityChange: new Date(),
        ...(location && { 
          currentLatitude: location.lat,
          currentLongitude: location.lng 
        })
      }
    })

    // Create availability history record
    await prisma.driverAvailabilityHistory.create({
      data: {
        driverId: driver.id,
        previousMode,
        newMode: mode,
        changeReason: reason || 'MANUAL',
        location: location || null,
        batteryLevel,
        networkQuality,
        timestamp: new Date()
      }
    })

    // If going online, update device info
    if (mode === 'ONLINE') {
      const deviceId = req.headers.get('device-id') || 'unknown'
      const userAgent = req.headers.get('user-agent') || ''
      
      await prisma.driverDeviceInfo.upsert({
        where: {
          driverId_deviceId: {
            driverId: driver.id,
            deviceId
          }
        },
        update: {
          lastSeen: new Date(),
          isActive: true,
          batteryLevel,
          networkQuality,
          gpsEnabled: !!location
        },
        create: {
          driverId: driver.id,
          deviceId,
          deviceType: 'MOBILE', // Default, can be enhanced
          platform: userAgent.includes('iPhone') ? 'iOS' : 'ANDROID',
          batteryLevel,
          networkQuality,
          gpsEnabled: !!location,
          isActive: true
        }
      })
    }

    // Send real-time update via Socket.io if available
    // This would notify the matching system and customers
    
    return NextResponse.json({
      message: `Driver availability updated to ${mode}`,
      driver: {
        id: updatedDriver.id,
        availabilityMode: updatedDriver.availabilityMode,
        isAvailable: updatedDriver.isAvailable,
        lastAvailabilityChange: updatedDriver.lastAvailabilityChange
      }
    })
  } catch (error) {
    console.error('Error updating driver availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get driver availability status and history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const includeHistory = searchParams.get('includeHistory') === 'true'
    const days = parseInt(searchParams.get('days') || '7')

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        availabilityMode: true,
        isAvailable: true,
        lastAvailabilityChange: true,
        availabilitySchedule: true,
        maxDailyHours: true,
        maxWeeklyHours: true,
        notificationRadius: true,
        quietHoursStart: true,
        quietHoursEnd: true
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const result: any = {
      availability: driver
    }

    if (includeHistory) {
      const historyStartDate = new Date()
      historyStartDate.setDate(historyStartDate.getDate() - days)
      
      const history = await prisma.driverAvailabilityHistory.findMany({
        where: {
          driverId: driver.id,
          timestamp: { gte: historyStartDate }
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      })

      result.history = history
    }

    // Get current shift info
    const activeShift = await prisma.driverShift.findFirst({
      where: {
        driverId: driver.id,
        status: 'ACTIVE'
      }
    })

    if (activeShift) {
      const hoursWorked = Math.floor(
        (Date.now() - activeShift.startTime.getTime()) / (1000 * 60 * 60)
      )
      result.currentShift = {
        ...activeShift,
        hoursWorked
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching driver availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
