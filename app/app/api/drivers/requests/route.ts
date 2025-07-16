

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Enhanced request handling - accept/reject with detailed responses
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      requestId,
      requestType, // 'order' or 'ride'
      action, // 'accept' or 'reject'
      reason,
      estimatedArrival,
      notes 
    } = await req.json()

    if (!requestId || !requestType || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: requestId, requestType, action' 
      }, { status: 400 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      include: { driverSettings: true }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    let request: any = null
    let responseTime: number = 0

    if (requestType === 'order') {
      // Find order assignment
      const assignment = await prisma.driverAssignment.findFirst({
        where: {
          id: requestId,
          driverId: driver.id,
          status: 'PENDING'
        },
        include: {
          order: {
            include: {
              vendor: true,
              customer: true,
              items: {
                include: {
                  product: true
                }
              }
            }
          }
        }
      })

      if (!assignment) {
        return NextResponse.json({ error: 'Order assignment not found or expired' }, { status: 404 })
      }

      request = assignment
      responseTime = 0 // Default response time since createdAt is not accessible

      // Update assignment status
      await prisma.driverAssignment.update({
        where: { id: assignment.id },
        data: {
          status: action.toUpperCase(),
          respondedAt: new Date(),
          response: reason || notes || null
        }
      })

      if (action === 'accept') {
        // Assign driver to order
        await prisma.order.update({
          where: { id: assignment.orderId },
          data: {
            driverId: driver.id,
            status: 'READY_FOR_PICKUP'
          }
        })

        // Update driver availability
        await prisma.driver.update({
          where: { id: driver.id },
          data: { isAvailable: false }
        })

        // Create notification for customer
        await prisma.notification.create({
          data: {
            userId: assignment.order.customerId,
            type: 'DRIVER_ASSIGNED',
            title: 'Driver Assigned',
            message: `Your driver is on the way to pick up your order #${assignment.order.orderNumber}`
          }
        })

        // Cancel other pending assignments for this order
        await prisma.driverAssignment.updateMany({
          where: {
            orderId: assignment.orderId,
            status: 'PENDING',
            id: { not: assignment.id }
          },
          data: { status: 'CANCELLED' }
        })
      }

    } else if (requestType === 'ride') {
      // Find ride request
      const ride = await prisma.ride.findFirst({
        where: {
          id: requestId,
          driverId: driver.id,
          status: 'PENDING'
        },
        include: {
          customer: true
        }
      })

      if (!ride) {
        return NextResponse.json({ error: 'Ride request not found or expired' }, { status: 404 })
      }

      request = ride
      responseTime = 0 // Default response time since createdAt is not accessible

      if (action === 'accept') {
        // Accept ride
        await prisma.ride.update({
          where: { id: ride.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date()
          }
        })

        // Update driver availability
        await prisma.driver.update({
          where: { id: driver.id },
          data: { isAvailable: false }
        })

        // Create notification for customer
        await prisma.notification.create({
          data: {
            userId: ride.customerId,
            type: 'RIDE_ACCEPTED',
            title: 'Ride Accepted',
            message: `Your driver is on the way to pick you up`
          }
        })

      } else if (action === 'reject') {
        // Reject ride
        await prisma.ride.update({
          where: { id: ride.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: reason || 'Driver rejected',
            cancelledBy: 'DRIVER'
          }
        })
      }
    }

    // Update driver performance metrics
    const currentAcceptance = driver.acceptanceRate || 0
    const currentRejection = driver.rejectionRate || 0
    const currentResponseTime = driver.avgResponseTime || 0

    let newAcceptanceRate = currentAcceptance
    let newRejectionRate = currentRejection
    let newResponseTime = currentResponseTime

    if (action === 'accept') {
      newAcceptanceRate = (currentAcceptance + 1) / 2 // Simplified calculation
    } else {
      newRejectionRate = (currentRejection + 1) / 2 // Simplified calculation
    }

    newResponseTime = (currentResponseTime + responseTime) / 2 // Simplified calculation

    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        acceptanceRate: newAcceptanceRate,
        rejectionRate: newRejectionRate,
        avgResponseTime: newResponseTime
      }
    })

    // Create driver request notification record
    await prisma.driverRequestNotification.create({
      data: {
        driverId: driver.id,
        orderId: requestType === 'order' ? request.orderId || request.id : null,
        rideId: requestType === 'ride' ? request.id : null,
        notificationType: requestType === 'order' ? 'ORDER_REQUEST' : 'RIDE_REQUEST',
        title: `${requestType === 'order' ? 'Order' : 'Ride'} Request`,
        message: `${requestType === 'order' ? 'Order' : 'Ride'} request ${action}ed`,
        priority: 'NORMAL',
        readAt: new Date(),
        respondedAt: new Date(),
        response: action.toUpperCase()
      }
    })

    return NextResponse.json({
      message: `${requestType === 'order' ? 'Order' : 'Ride'} request ${action}ed successfully`,
      request: {
        id: requestId,
        type: requestType,
        action: action,
        responseTime: responseTime,
        processedAt: new Date()
      },
      driver: {
        acceptanceRate: newAcceptanceRate,
        rejectionRate: newRejectionRate,
        avgResponseTime: newResponseTime
      }
    })
  } catch (error) {
    console.error('Error processing request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get pending requests
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      include: { driverSettings: true }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Get pending order assignments
    const orderAssignments = await prisma.driverAssignment.findMany({
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
                phone: true,
                latitude: true,
                longitude: true
              }
            },
            customer: {
              select: {
                name: true,
                phone: true
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
            }
          }
        }
      },
      orderBy: { priority: 'desc' }
    })

    // Get pending ride requests
    const rideRequests = await prisma.ride.findMany({
      where: {
        driverId: driver.id,
        status: 'PENDING'
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      orderAssignments,
      rideRequests,
      summary: {
        totalPendingOrders: orderAssignments.length,
        totalPendingRides: rideRequests.length,
        settings: {
          autoAcceptRequests: driver.driverSettings?.autoAcceptRequests || false,
          acceptanceTimeLimit: driver.driverSettings?.acceptanceTimeLimit || 30,
          minOrderValue: driver.driverSettings?.minOrderValue || 0,
          maxDeliveryDistance: driver.driverSettings?.maxDeliveryDistance || 20
        }
      }
    })
  } catch (error) {
    console.error('Error fetching pending requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
