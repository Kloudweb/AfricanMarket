
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get order tracking details
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = params.id

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tracking: {
          orderBy: { timestamp: 'desc' }
        },
        timeEstimate: true,
        driver: {
          include: {
            user: {
              select: {
                name: true,
                phone: true,
                avatar: true
              }
            },
            locations: {
              where: { isOnline: true },
              orderBy: { timestamp: 'desc' },
              take: 1
            }
          }
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            phone: true,
            address: true,
            latitude: true,
            longitude: true,
            userId: true
          }
        },
        deliveryConfirmation: {
          include: {
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
        },
        preparationTime: {
          orderBy: { createdAt: 'desc' as const },
          take: 1
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user has access to this order
    const hasAccess = order.customerId === session.user.id || 
                     (order.driver?.userId === session.user.id) ||
                     (order.vendor?.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current driver location if available
    const driverLocation = order.driver?.locations?.[0] || null

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        estimatedDelivery: order.estimatedDelivery,
        actualDelivery: order.actualDelivery,
        createdAt: order.createdAt,
        isDelivery: order.isDelivery,
        deliveryAddress: order.deliveryAddress,
        deliveryLatitude: order.deliveryLatitude,
        deliveryLongitude: order.deliveryLongitude
      },
      tracking: order.tracking,
      timeEstimate: order.timeEstimate,
      preparationTime: order.preparationTime?.[0],
      vendor: order.vendor,
      driver: order.driver ? {
        id: order.driver.id,
        user: order.driver.user,
        vehicleType: order.driver.vehicleType,
        vehicleMake: order.driver.vehicleMake,
        vehicleModel: order.driver.vehicleModel,
        vehicleColor: order.driver.vehicleColor,
        vehiclePlate: order.driver.vehiclePlate,
        rating: order.driver.rating,
        totalDeliveries: order.driver.totalDeliveries,
        currentLocation: driverLocation
      } : null,
      deliveryConfirmation: order.deliveryConfirmation
    })
  } catch (error) {
    console.error('Error fetching order tracking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update order status (vendor/driver only)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = params.id
    const { status, message, latitude, longitude, estimatedTime } = await req.json()

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendor: true,
        driver: true,
        preparationTime: {
          orderBy: { createdAt: 'desc' as const },
          take: 1
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user can update this order
    const canUpdate = order.vendor?.userId === session.user.id || 
                     order.driver?.userId === session.user.id ||
                     session.user.role === 'ADMIN'

    if (!canUpdate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === 'DELIVERED' && { actualDelivery: new Date() }),
        ...(estimatedTime && { estimatedDelivery: new Date(estimatedTime) })
      }
    })

    // Add tracking entry
    await prisma.orderTracking.create({
      data: {
        orderId,
        status,
        message,
        latitude,
        longitude,
        updatedBy: session.user.id,
        actualTime: new Date()
      }
    })

    // Update time estimate if provided
    if (estimatedTime) {
      await prisma.orderTimeEstimate.upsert({
        where: { orderId },
        update: {
          ...(status === 'PREPARING' && { 
            estimatedPickup: new Date(Date.now() + (order.preparationTime?.[0]?.estimatedTime || 30) * 60000) 
          }),
          ...(status === 'OUT_FOR_DELIVERY' && { 
            estimatedDelivery: new Date(estimatedTime) 
          })
        },
        create: {
          orderId,
          preparationTime: 30,
          pickupTime: 10,
          deliveryTime: 20,
          totalTime: 60,
          estimatedDelivery: new Date(estimatedTime)
        }
      })
    }

    // TODO: Send real-time notification to customer

    return NextResponse.json({
      message: 'Order status updated successfully',
      order: updatedOrder
    })
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
