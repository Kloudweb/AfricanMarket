
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { matchingService } from '@/lib/matching-service'

export const dynamic = 'force-dynamic'

// Get driver performance metrics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'weekly'
    const driverId = searchParams.get('driverId')
    
    // If driverId is provided, check admin permissions
    let targetDriverId = driverId
    if (!driverId) {
      const driver = await prisma.driver.findUnique({
        where: { userId: session.user.id }
      })
      if (!driver) {
        return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
      }
      targetDriverId = driver.id
    } else if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get performance metrics
    const metrics = await prisma.driverPerformanceMetrics.findMany({
      where: {
        driverId: targetDriverId!,
        period
      },
      orderBy: { periodStart: 'desc' },
      take: 10
    })

    // Get recent assignment history
    const assignmentHistory = await prisma.driverAssignmentHistory.findMany({
      where: {
        driverId: targetDriverId!
      },
      orderBy: { assignedAt: 'desc' },
      take: 20,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            vendor: {
              select: {
                businessName: true
              }
            }
          }
        },
        ride: {
          select: {
            id: true,
            rideNumber: true,
            estimatedFare: true,
            pickupAddress: true,
            destinationAddress: true
          }
        }
      }
    })

    // Get driver details
    const driver = await prisma.driver.findUnique({
      where: { id: targetDriverId! },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      driver,
      metrics,
      assignmentHistory,
      summary: metrics.length > 0 ? metrics[0] : null
    })
  } catch (error) {
    console.error('Error getting performance metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update driver performance metrics
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { driverId, forceUpdate } = body

    let targetDriverId = driverId
    if (!driverId) {
      const driver = await prisma.driver.findUnique({
        where: { userId: session.user.id }
      })
      if (!driver) {
        return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
      }
      targetDriverId = driver.id
    } else if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Update performance metrics
    await matchingService.updateDriverPerformanceMetrics(targetDriverId)

    return NextResponse.json({
      success: true,
      message: 'Performance metrics updated successfully'
    })
  } catch (error) {
    console.error('Error updating performance metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
