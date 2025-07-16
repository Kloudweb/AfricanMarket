
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get revenue analytics
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canAccessFinancials')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'monthly'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const serviceType = searchParams.get('serviceType') // 'delivery' or 'rideshare'

    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    // Revenue from orders
    const orderRevenue = await prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
      },
      _sum: {
        totalAmount: true,
        subtotal: true,
        deliveryFee: true,
        tax: true
      },
      _count: true
    })

    // Revenue from rides
    const rideRevenue = await prisma.ride.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
      },
      _sum: {
        actualFare: true,
        baseFare: true,
        distanceFare: true,
        timeFare: true,
        surgeFare: true
      },
      _count: true
    })

    // Commission calculations
    const vendorCommissions = await prisma.vendor.aggregate({
      _sum: { commissionRate: true },
      _count: true
    })

    const driverCommissions = await prisma.driver.aggregate({
      _sum: { commissionRate: true },
      _count: true
    })

    // Payment processing fees
    const paymentFees = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
      },
      _sum: {
        processingFee: true,
        platformFee: true
      }
    })

    // Calculate totals
    const totalOrderRevenue = orderRevenue._sum.totalAmount || 0
    const totalRideRevenue = rideRevenue._sum.actualFare || 0
    const totalRevenue = totalOrderRevenue + totalRideRevenue

    const avgVendorCommission = vendorCommissions._sum.commissionRate ? 
      vendorCommissions._sum.commissionRate / vendorCommissions._count : 0.20
    const avgDriverCommission = driverCommissions._sum.commissionRate ? 
      driverCommissions._sum.commissionRate / driverCommissions._count : 0.25

    const estimatedVendorCommission = totalOrderRevenue * avgVendorCommission
    const estimatedDriverCommission = (totalOrderRevenue + totalRideRevenue) * avgDriverCommission
    const platformRevenue = totalRevenue - estimatedVendorCommission - estimatedDriverCommission

    // Revenue trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const revenueTrends = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as daily_revenue,
        COUNT(*) as order_count
      FROM "Order"
      WHERE created_at >= ${thirtyDaysAgo}
        AND status = 'DELIVERED'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `

    // Top performing vendors
    const topVendors = await prisma.vendor.findMany({
      select: {
        id: true,
        businessName: true,
        orders: {
          where: {
            status: 'DELIVERED',
            createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
          },
          select: {
            totalAmount: true
          }
        }
      },
      take: 10
    })

    const vendorRevenue = topVendors.map(vendor => ({
      ...vendor,
      revenue: vendor.orders.reduce((sum, order) => sum + order.totalAmount, 0),
      orderCount: vendor.orders.length
    })).sort((a, b) => b.revenue - a.revenue)

    // Geographic revenue distribution
    const geographicRevenue = await prisma.order.groupBy({
      by: ['vendor'],
      where: {
        status: 'DELIVERED',
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
      },
      _sum: { totalAmount: true },
      _count: true
    })

    await logAdminAction(
      authResult.user.id,
      'VIEW_REVENUE_ANALYTICS',
      'revenue',
      undefined,
      undefined,
      { period, startDate, endDate, serviceType },
      req
    )

    return NextResponse.json({
      summary: {
        totalRevenue,
        orderRevenue: totalOrderRevenue,
        rideRevenue: totalRideRevenue,
        vendorCommission: estimatedVendorCommission,
        driverCommission: estimatedDriverCommission,
        platformRevenue,
        processingFees: paymentFees._sum.processingFee || 0,
        platformFees: paymentFees._sum.platformFee || 0,
        totalOrders: orderRevenue._count,
        totalRides: rideRevenue._count,
        avgOrderValue: totalOrderRevenue / (orderRevenue._count || 1),
        avgRideValue: totalRideRevenue / (rideRevenue._count || 1)
      },
      trends: revenueTrends,
      topVendors: vendorRevenue,
      geographic: geographicRevenue,
      breakdown: {
        order: {
          subtotal: orderRevenue._sum.subtotal || 0,
          deliveryFee: orderRevenue._sum.deliveryFee || 0,
          tax: orderRevenue._sum.tax || 0
        },
        ride: {
          baseFare: rideRevenue._sum.baseFare || 0,
          distanceFare: rideRevenue._sum.distanceFare || 0,
          timeFare: rideRevenue._sum.timeFare || 0,
          surgeFare: rideRevenue._sum.surgeFare || 0
        }
      }
    })
  } catch (error) {
    console.error('Error fetching revenue analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Generate revenue report
export async function POST(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canAccessFinancials')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { type, startDate, endDate, period } = await req.json()

    // Check if report already exists
    const existingReport = await prisma.revenueReport.findFirst({
      where: {
        type,
        period,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      }
    })

    if (existingReport) {
      return NextResponse.json({ 
        message: 'Report already exists',
        report: existingReport 
      })
    }

    // Calculate revenue metrics
    const dateFilter = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    }

    const [orderMetrics, rideMetrics, userMetrics] = await Promise.all([
      prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          createdAt: dateFilter
        },
        _sum: {
          totalAmount: true,
          subtotal: true,
          deliveryFee: true,
          tax: true
        },
        _count: true
      }),
      prisma.ride.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: dateFilter
        },
        _sum: {
          actualFare: true
        },
        _count: true
      }),
      prisma.user.count({
        where: {
          createdAt: dateFilter
        }
      })
    ])

    const totalRevenue = (orderMetrics._sum.totalAmount || 0) + (rideMetrics._sum.actualFare || 0)
    const orderRevenue = orderMetrics._sum.totalAmount || 0
    const rideRevenue = rideMetrics._sum.actualFare || 0

    // Estimate commissions (simplified)
    const vendorCommission = orderRevenue * 0.20
    const driverCommission = (orderRevenue + rideRevenue) * 0.25
    const platformRevenue = totalRevenue - vendorCommission - driverCommission

    // Create report
    const report = await prisma.revenueReport.create({
      data: {
        type,
        period,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalRevenue,
        orderRevenue,
        rideRevenue,
        vendorCommission,
        driverCommission,
        platformRevenue,
        totalOrders: orderMetrics._count,
        totalRides: rideMetrics._count,
        totalUsers: userMetrics,
        avgOrderValue: orderRevenue / (orderMetrics._count || 1),
        avgRideValue: rideRevenue / (rideMetrics._count || 1),
        generatedBy: authResult.user.id
      }
    })

    await logAdminAction(
      authResult.user.id,
      'GENERATE_REVENUE_REPORT',
      'revenue_report',
      report.id,
      undefined,
      { type, period, startDate, endDate },
      req
    )

    return NextResponse.json({
      message: 'Revenue report generated successfully',
      report
    })
  } catch (error) {
    console.error('Error generating revenue report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
