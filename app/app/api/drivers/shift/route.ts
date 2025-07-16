
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Start/End driver shift
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await req.json() // 'start', 'end', 'pause'

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    if (action === 'start') {
      // Check if driver has an active shift
      const activeShift = await prisma.driverShift.findFirst({
        where: {
          driverId: driver.id,
          status: 'ACTIVE'
        }
      })

      if (activeShift) {
        return NextResponse.json({ error: 'Shift already active' }, { status: 400 })
      }

      // Start new shift
      const shift = await prisma.driverShift.create({
        data: {
          driverId: driver.id,
          startTime: new Date(),
          status: 'ACTIVE'
        }
      })

      // Update driver availability
      await prisma.driver.update({
        where: { id: driver.id },
        data: { isAvailable: true }
      })

      return NextResponse.json({
        message: 'Shift started successfully',
        shift
      })
    } else if (action === 'end') {
      // Find active shift
      const activeShift = await prisma.driverShift.findFirst({
        where: {
          driverId: driver.id,
          status: 'ACTIVE'
        }
      })

      if (!activeShift) {
        return NextResponse.json({ error: 'No active shift found' }, { status: 400 })
      }

      // Calculate shift stats
      const startTime = new Date(activeShift.startTime)
      const endTime = new Date()
      const totalTime = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60) // in minutes

      // Get earnings for this shift
      const earnings = await prisma.earning.findMany({
        where: {
          driverId: driver.id,
          createdAt: {
            gte: startTime,
            lte: endTime
          }
        }
      })

      const totalEarnings = earnings.reduce((sum, earning) => sum + earning.netAmount, 0)
      const totalDeliveries = earnings.length

      // End shift
      const shift = await prisma.driverShift.update({
        where: { id: activeShift.id },
        data: {
          endTime,
          status: 'ENDED',
          totalTime,
          totalEarnings,
          totalDeliveries
        }
      })

      // Update driver availability
      await prisma.driver.update({
        where: { id: driver.id },
        data: { isAvailable: false }
      })

      return NextResponse.json({
        message: 'Shift ended successfully',
        shift
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error managing driver shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get current shift info
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const activeShift = await prisma.driverShift.findFirst({
      where: {
        driverId: driver.id,
        status: 'ACTIVE'
      }
    })

    if (!activeShift) {
      return NextResponse.json({ 
        activeShift: null,
        isOnShift: false 
      })
    }

    // Calculate current shift stats
    const startTime = new Date(activeShift.startTime)
    const currentTime = new Date()
    const elapsedTime = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000 / 60) // in minutes

    // Get earnings since shift start
    const earnings = await prisma.earning.findMany({
      where: {
        driverId: driver.id,
        createdAt: {
          gte: startTime,
          lte: currentTime
        }
      }
    })

    const currentEarnings = earnings.reduce((sum, earning) => sum + earning.netAmount, 0)
    const currentDeliveries = earnings.length

    return NextResponse.json({
      activeShift: {
        ...activeShift,
        elapsedTime,
        currentEarnings,
        currentDeliveries
      },
      isOnShift: true
    })
  } catch (error) {
    console.error('Error fetching shift info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
