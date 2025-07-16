
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Auto-assign driver to order
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, radius = 10 } = await req.json()

    // Check if user has permission (admin, vendor, or system)
    if (session.user.role !== 'ADMIN') {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { vendor: true }
      })

      if (!order || order.vendor?.userId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendor: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.driverId) {
      return NextResponse.json({ error: 'Driver already assigned' }, { status: 400 })
    }

    // Find available drivers within radius
    const availableDrivers = await prisma.driver.findMany({
      where: {
        isAvailable: true,
        verificationStatus: 'VERIFIED',
        canDeliverFood: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        locations: {
          where: { isOnline: true },
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    })

    if (availableDrivers.length === 0) {
      return NextResponse.json({ error: 'No available drivers found' }, { status: 404 })
    }

    // Calculate distances and ETAs
    const driversWithDistance = availableDrivers
      .filter(driver => driver.locations.length > 0)
      .map(driver => {
        const location = driver.locations[0]
        // Simple distance calculation (in a real app, use Google Maps API)
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          order.vendor?.latitude || 0,
          order.vendor?.longitude || 0
        )
        
        return {
          driver,
          distance,
          eta: Math.ceil(distance / 0.5) // Assume 30 km/h average speed
        }
      })
      .filter(item => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    if (driversWithDistance.length === 0) {
      return NextResponse.json({ error: 'No drivers available within radius' }, { status: 404 })
    }

    // Create assignments for top 3 closest drivers
    const assignments = await Promise.all(
      driversWithDistance.slice(0, 3).map(async (item, index) => {
        return await prisma.driverAssignment.create({
          data: {
            orderId,
            driverId: item.driver.id,
            priority: 10 - index, // Higher priority for closer drivers
            distance: item.distance,
            eta: item.eta,
            expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes to respond
          }
        })
      })
    )

    // TODO: Send push notifications to assigned drivers

    return NextResponse.json({
      message: 'Driver assignment created successfully',
      assignments
    })
  } catch (error) {
    console.error('Error creating driver assignment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get assignment statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const assignments = await prisma.driverAssignment.findMany({
      where: {
        assignedAt: { gte: startDate }
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        },
        driver: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    const totalAssignments = assignments.length
    const acceptedAssignments = assignments.filter(a => a.status === 'ACCEPTED').length
    const rejectedAssignments = assignments.filter(a => a.status === 'REJECTED').length
    const expiredAssignments = assignments.filter(a => a.status === 'EXPIRED').length

    const avgResponseTime = assignments
      .filter(a => a.respondedAt)
      .reduce((sum, a, _, arr) => {
        const responseTime = a.respondedAt!.getTime() - a.assignedAt.getTime()
        return sum + responseTime / arr.length
      }, 0) / 1000 / 60 // Convert to minutes

    return NextResponse.json({
      statistics: {
        totalAssignments,
        acceptedAssignments,
        rejectedAssignments,
        expiredAssignments,
        acceptanceRate: totalAssignments > 0 ? (acceptedAssignments / totalAssignments * 100).toFixed(1) : 0,
        avgResponseTime: avgResponseTime.toFixed(1)
      },
      assignments: assignments.slice(0, 20) // Recent assignments
    })
  } catch (error) {
    console.error('Error fetching assignment statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Simple distance calculation function
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
