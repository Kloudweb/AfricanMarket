
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get driver dashboard data
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            avatar: true
          }
        }
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Get current shift
    const activeShift = await prisma.driverShift.findFirst({
      where: {
        driverId: driver.id,
        status: 'ACTIVE'
      }
    })

    // Get pending assignments
    const pendingAssignments = await prisma.driverAssignment.findMany({
      where: {
        driverId: driver.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        order: {
          include: {
            vendor: {
              select: {
                businessName: true,
                address: true,
                phone: true
              }
            },
            items: {
              include: {
                product: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { priority: 'desc' }
    })

    // Get active order (if any)
    const activeOrder = await prisma.order.findFirst({
      where: {
        driverId: driver.id,
        status: {
          in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY']
        }
      },
      include: {
        vendor: {
          select: {
            businessName: true,
            address: true,
            phone: true,
            latitude: true,
            longitude: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                image: true
              }
            }
          }
        },
        timeEstimate: true
      }
    })

    // Get today's earnings
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEarnings = await prisma.earning.findMany({
      where: {
        driverId: driver.id,
        createdAt: { gte: today }
      }
    })

    const todayStats = {
      totalEarnings: todayEarnings.reduce((sum, earning) => sum + earning.netAmount, 0),
      totalDeliveries: todayEarnings.length,
      totalDistance: 0, // Calculate from location history if needed
      onlineTime: activeShift ? Math.floor((Date.now() - activeShift.startTime.getTime()) / 1000 / 60) : 0
    }

    // Get recent deliveries
    const recentDeliveries = await prisma.order.findMany({
      where: {
        driverId: driver.id,
        status: 'DELIVERED'
      },
      include: {
        vendor: {
          select: {
            businessName: true
          }
        },
        deliveryConfirmation: true
      },
      orderBy: { actualDelivery: 'desc' },
      take: 5
    })

    return NextResponse.json({
      driver: {
        id: driver.id,
        user: driver.user,
        vehicleType: driver.vehicleType,
        vehicleMake: driver.vehicleMake,
        vehicleModel: driver.vehicleModel,
        vehicleColor: driver.vehicleColor,
        vehiclePlate: driver.vehiclePlate,
        rating: driver.rating,
        totalDeliveries: driver.totalDeliveries,
        isAvailable: driver.isAvailable,
        verificationStatus: driver.verificationStatus
      },
      activeShift,
      pendingAssignments,
      activeOrder,
      todayStats,
      recentDeliveries
    })
  } catch (error) {
    console.error('Error fetching driver dashboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
