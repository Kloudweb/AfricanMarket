
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get order details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageOrders')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          include: {
            customerOrders: {
              select: { id: true, status: true, totalAmount: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 5
            }
          }
        },
        vendor: {
          include: {
            orders: {
              select: { id: true, status: true, totalAmount: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 5
            }
          }
        },
        driver: {
          include: {
            user: true,
            deliveryOrders: {
              select: { id: true, status: true, totalAmount: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 5
            }
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                price: true,
                image: true,
                vendor: {
                  select: { businessName: true }
                }
              }
            }
          }
        },
        tracking: {
          orderBy: { timestamp: 'desc' }
        },
        payment: true,
        review: true,
        notifications: {
          orderBy: { createdAt: 'desc' }
        },
        orderChat: {
          include: {
            sender: {
              select: { name: true, role: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        assignments: {
          include: {
            driver: {
              include: {
                user: { select: { name: true } }
              }
            }
          },
          orderBy: { assignedAt: 'desc' }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    await logAdminAction(
      authResult.user.id,
      'VIEW_ORDER_DETAILS',
      'order',
      params.id,
      undefined,
      undefined,
      req
    )

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error fetching order details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageOrders')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const updates = await req.json()
    
    // Get current order for audit log
    const currentOrder = await prisma.order.findUnique({
      where: { id: params.id }
    })

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: updates,
      include: {
        customer: true,
        vendor: true,
        driver: true
      }
    })

    // Add tracking entry
    await prisma.orderTracking.create({
      data: {
        orderId: params.id,
        status: updates.status || currentOrder.status,
        message: `Status updated by admin`,
        timestamp: new Date(),
        updatedBy: authResult.user.id
      }
    })

    await logAdminAction(
      authResult.user.id,
      'UPDATE_ORDER',
      'order',
      params.id,
      currentOrder,
      updates,
      req
    )

    return NextResponse.json({ 
      message: 'Order updated successfully',
      order: updatedOrder 
    })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
