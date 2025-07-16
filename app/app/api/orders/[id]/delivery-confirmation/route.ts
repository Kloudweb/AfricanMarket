
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Create delivery confirmation
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = params.id
    const { latitude, longitude, photos, signature, notes } = await req.json()

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        driver: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user is the assigned driver
    if (order.driver?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create delivery confirmation
    const deliveryConfirmation = await prisma.deliveryConfirmation.create({
      data: {
        orderId,
        driverId: order.driver.id,
        customerId: order.customerId,
        latitude,
        longitude,
        photos: photos || [],
        signature,
        notes
      }
    })

    // Update order status to delivered
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        actualDelivery: new Date()
      }
    })

    // Add tracking entry
    await prisma.orderTracking.create({
      data: {
        orderId,
        status: 'DELIVERED',
        message: 'Order delivered successfully',
        latitude,
        longitude,
        updatedBy: session.user.id,
        actualTime: new Date()
      }
    })

    // Update driver availability
    await prisma.driver.update({
      where: { id: order.driver.id },
      data: { isAvailable: true }
    })

    // TODO: Send delivery confirmation notification to customer

    return NextResponse.json({
      message: 'Delivery confirmed successfully',
      confirmation: deliveryConfirmation
    })
  } catch (error) {
    console.error('Error confirming delivery:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get delivery confirmation
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = params.id

    const deliveryConfirmation = await prisma.deliveryConfirmation.findUnique({
      where: { orderId },
      include: {
        driver: {
          include: {
            user: {
              select: {
                name: true,
                phone: true
              }
            }
          }
        }
      }
    })

    if (!deliveryConfirmation) {
      return NextResponse.json({ error: 'Delivery confirmation not found' }, { status: 404 })
    }

    // Check if user has access to this delivery confirmation
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        customerId: true,
        vendor: { select: { userId: true } }
      }
    })

    const hasAccess = order?.customerId === session.user.id || 
                     order?.vendor?.userId === session.user.id ||
                     deliveryConfirmation.driver?.userId === session.user.id

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ confirmation: deliveryConfirmation })
  } catch (error) {
    console.error('Error fetching delivery confirmation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
