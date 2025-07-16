
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get order details
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true,
                price: true,
                category: true
              }
            }
          }
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            logo: true,
            phone: true,
            address: true,
            city: true,
            province: true
          }
        },
        driver: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                phone: true
              }
            },
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleColor: true,
            vehiclePlate: true
          }
        },
        tracking: {
          orderBy: {
            timestamp: 'desc'
          }
        },
        vendorOrders: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    image: true
                  }
                }
              }
            }
          }
        },
        taxCalculation: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user owns this order
    if (order.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Cancel order
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = params.id

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendorOrders: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user owns this order
    if (order.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if order can be cancelled
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      return NextResponse.json({ 
        error: 'Order cannot be cancelled' 
      }, { status: 400 })
    }

    if (order.status === 'PREPARING' || order.status === 'OUT_FOR_DELIVERY') {
      return NextResponse.json({ 
        error: 'Order is being prepared or out for delivery. Please contact support.' 
      }, { status: 400 })
    }

    // Cancel the order
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' }
    })

    // Cancel vendor orders
    await prisma.vendorOrder.updateMany({
      where: { orderId: orderId },
      data: { status: 'CANCELLED' }
    })

    // Add tracking entry
    await prisma.orderTracking.create({
      data: {
        orderId: orderId,
        status: 'CANCELLED',
        message: 'Order cancelled by customer'
      }
    })

    return NextResponse.json({ message: 'Order cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
