
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get all orders with filtering and pagination
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageOrders')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const vendorId = searchParams.get('vendorId')
    const driverId = searchParams.get('driverId')
    const searchTerm = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const skip = (page - 1) * limit

    // Build filter conditions
    const where: any = {}
    
    if (status) where.status = status
    if (vendorId) where.vendorId = vendorId
    if (driverId) where.driverId = driverId
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }
    
    if (searchTerm) {
      where.OR = [
        { orderNumber: { contains: searchTerm, mode: 'insensitive' } },
        { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { customer: { email: { contains: searchTerm, mode: 'insensitive' } } },
        { vendor: { businessName: { contains: searchTerm, mode: 'insensitive' } } }
      ]
    }

    // Get orders with pagination
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
              phone: true
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
              vehicleType: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  price: true
                }
              }
            }
          },
          tracking: {
            orderBy: { timestamp: 'desc' },
            take: 1
          },
          payment: {
            select: {
              status: true,
              amount: true,
              paymentProvider: true
            }
          }
        }
      }),
      prisma.order.count({ where })
    ])

    // Get order statistics
    const stats = await prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { totalAmount: true }
    })

    await logAdminAction(
      authResult.user.id,
      'VIEW_ORDERS',
      'orders',
      undefined,
      undefined,
      { filters: Object.fromEntries(searchParams.entries()) },
      req
    )

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create intervention for order
export async function POST(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageOrders')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { orderId, action, reason, notes } = await req.json()

    // Get current order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        vendor: true,
        driver: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let result
    switch (action) {
      case 'cancel':
        result = await prisma.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' }
        })
        break
      
      case 'assign_driver':
        const { driverId } = await req.json()
        result = await prisma.order.update({
          where: { id: orderId },
          data: { driverId }
        })
        break
      
      case 'refund':
        const { refundAmount } = await req.json()
        // Process refund through payment system
        result = await prisma.payment.update({
          where: { orderId },
          data: { status: 'REFUNDED' }
        })
        break
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await logAdminAction(
      authResult.user.id,
      `ORDER_${action.toUpperCase()}`,
      'order',
      orderId,
      order,
      { action, reason, notes },
      req
    )

    return NextResponse.json({
      message: `Order ${action} successful`,
      order: result
    })
  } catch (error) {
    console.error('Error processing order intervention:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
