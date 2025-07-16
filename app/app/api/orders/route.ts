
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get user orders
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    const whereClause: any = {
      customerId: session.user.id
    }

    if (status) {
      whereClause.status = status
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                price: true
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
            address: true
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
            vehiclePlate: true
          }
        },
        tracking: {
          orderBy: {
            timestamp: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    const totalOrders = await prisma.order.count({
      where: whereClause
    })

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
