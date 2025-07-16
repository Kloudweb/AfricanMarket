
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get order tracking
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = params.id

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        status: true,
        estimatedDelivery: true,
        actualDelivery: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user owns this order
    if (order.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tracking = await prisma.orderTracking.findMany({
      where: { orderId: orderId },
      orderBy: {
        timestamp: 'asc'
      }
    })

    return NextResponse.json({
      orderId: order.id,
      currentStatus: order.status,
      estimatedDelivery: order.estimatedDelivery,
      actualDelivery: order.actualDelivery,
      tracking
    })
  } catch (error) {
    console.error('Error fetching order tracking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
