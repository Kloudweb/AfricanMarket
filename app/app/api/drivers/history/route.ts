

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get driver trip/delivery history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'all' // all, orders, rides
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const result: any = {
      orders: [],
      rides: [],
      summary: {
        totalOrders: 0,
        totalRides: 0,
        totalEarnings: 0,
        totalDistance: 0,
        avgRating: 0
      }
    }

    // Date range filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    // Get orders if requested
    if (type === 'all' || type === 'orders') {
      const orderWhere: any = {
        driverId: driver.id
      }

      if (status) {
        orderWhere.status = status
      }

      if (Object.keys(dateFilter).length > 0) {
        orderWhere.createdAt = dateFilter
      }

      if (search) {
        orderWhere.OR = [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { deliveryAddress: { contains: search, mode: 'insensitive' } }
        ]
      }

      const [orders, ordersTotal] = await Promise.all([
        prisma.order.findMany({
          where: orderWhere,
          include: {
            vendor: {
              select: {
                businessName: true,
                address: true,
                phone: true
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
            },
            deliveryConfirmation: {
              select: {
                photos: true,
                signature: true,
                notes: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: type === 'orders' ? (page - 1) * limit : 0,
          take: type === 'orders' ? limit : undefined
        }),
        prisma.order.count({ where: orderWhere })
      ])

      result.orders = orders
      result.summary.totalOrders = ordersTotal
    }

    // Get rides if requested
    if (type === 'all' || type === 'rides') {
      const rideWhere: any = {
        driverId: driver.id
      }

      if (status) {
        rideWhere.status = status
      }

      if (Object.keys(dateFilter).length > 0) {
        rideWhere.createdAt = dateFilter
      }

      if (search) {
        rideWhere.OR = [
          { rideNumber: { contains: search, mode: 'insensitive' } },
          { pickupAddress: { contains: search, mode: 'insensitive' } },
          { destinationAddress: { contains: search, mode: 'insensitive' } }
        ]
      }

      const [rides, ridesTotal] = await Promise.all([
        prisma.ride.findMany({
          where: rideWhere,
          include: {
            customer: {
              select: {
                name: true,
                phone: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: type === 'rides' ? (page - 1) * limit : 0,
          take: type === 'rides' ? limit : undefined
        }),
        prisma.ride.count({ where: rideWhere })
      ])

      result.rides = rides
      result.summary.totalRides = ridesTotal
    }

    // Calculate summary statistics
    const allEarnings = await prisma.earning.findMany({
      where: {
        driverId: driver.id,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }
    })

    result.summary.totalEarnings = allEarnings.reduce((sum, earning) => sum + earning.netAmount, 0)
    result.summary.totalDistance = 0 // Not available in current schema
    result.summary.avgRating = driver.rating || 0

    // Add pagination info
    const totalItems = type === 'orders' ? result.summary.totalOrders : 
                      type === 'rides' ? result.summary.totalRides : 
                      result.summary.totalOrders + result.summary.totalRides

    result.pagination = {
      page,
      limit,
      total: totalItems,
      pages: Math.ceil(totalItems / limit)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching driver history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Export history data
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { format, startDate, endDate, type } = await req.json()

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Validate format
    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format. Use json or csv' }, { status: 400 })
    }

    // Date range filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    let exportData: any[] = []

    if (type === 'all' || type === 'orders') {
      const orders = await prisma.order.findMany({
        where: {
          driverId: driver.id,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },
        include: {
          vendor: {
            select: {
              businessName: true,
              address: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      exportData = [...exportData, ...orders.map(order => ({
        type: 'ORDER',
        id: order.id,
        number: order.orderNumber,
        date: order.createdAt.toISOString(),
        status: order.status,
        vendor: order.vendor.businessName,
        vendorAddress: order.vendor.address,
        deliveryAddress: order.deliveryAddress,
        totalAmount: order.totalAmount,
        earnings: 0, // Not available in current schema
        distance: 0, // Not available in current schema
        timeSpent: 0, // Not available in current schema
        rating: null, // Not available in current schema
        customerFeedback: null, // Not available in current schema
        deliveredAt: order.actualDelivery?.toISOString() || null
      }))]
    }

    if (type === 'all' || type === 'rides') {
      const rides = await prisma.ride.findMany({
        where: {
          driverId: driver.id,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },

        orderBy: { createdAt: 'desc' }
      })

      exportData = [...exportData, ...rides.map(ride => ({
        type: 'RIDE',
        id: ride.id,
        number: ride.rideNumber,
        date: ride.createdAt.toISOString(),
        status: ride.status,
        pickupAddress: ride.pickupAddress,
        destinationAddress: ride.destinationAddress,
        distance: ride.distance,
        fare: ride.actualFare,
        earnings: 0, // Not available in current schema
        timeSpent: 0, // Not available in current schema
        rating: null, // Not available in current schema
        customerFeedback: null, // Not available in current schema
        completedAt: ride.completedAt?.toISOString() || null
      }))]
    }

    if (format === 'csv') {
      // Convert to CSV format
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => 
            typeof row[header] === 'string' ? `"${row[header]}"` : row[header]
          ).join(',')
        )
      ].join('\n')

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="driver_history_${Date.now()}.csv"`
        }
      })
    }

    return NextResponse.json({
      message: 'History data exported successfully',
      data: exportData,
      summary: {
        totalRecords: exportData.length,
        exportedAt: new Date().toISOString(),
        period: { startDate, endDate }
      }
    })
  } catch (error) {
    console.error('Error exporting driver history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
