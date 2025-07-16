
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get admin dashboard statistics
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const timeRange = searchParams.get('timeRange') || '7d'

    // Calculate date range
    const now = new Date()
    const timeRangeMap = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    }
    const days = timeRangeMap[timeRange as keyof typeof timeRangeMap] || 7
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    // Get basic statistics
    const [
      totalUsers,
      totalOrders,
      totalVendors,
      totalDrivers,
      totalRevenue,
      totalDisputes,
      activeUsers,
      recentOrders,
      pendingDisputes,
      systemHealth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.vendor.count(),
      prisma.driver.count(),
      prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          createdAt: { gte: startDate }
        },
        _sum: { totalAmount: true }
      }),
      prisma.dispute.count(),
      prisma.user.count({
        where: {
          isActive: true,
          updatedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),
      prisma.dispute.count({
        where: {
          status: { in: ['CREATED', 'UNDER_REVIEW'] }
        }
      }),
      prisma.systemHealth.findMany({
        where: {
          timestamp: { gte: new Date(now.getTime() - 5 * 60 * 1000) }
        },
        orderBy: { timestamp: 'desc' },
        distinct: ['component']
      })
    ])

    // Get recent activity
    const recentActivity = await prisma.adminAuditLog.findMany({
      take: 20,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Get user growth data
    const userGrowth = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM "User"
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `

    // Get order trends
    const orderTrends = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM "Order"
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `

    // Get top performing vendors
    const topVendors = await prisma.vendor.findMany({
      select: {
        id: true,
        businessName: true,
        rating: true,
        totalReviews: true,
        orders: {
          where: {
            status: 'DELIVERED',
            createdAt: { gte: startDate }
          },
          select: {
            totalAmount: true
          }
        }
      },
      take: 10
    })

    const vendorStats = topVendors.map(vendor => ({
      ...vendor,
      revenue: vendor.orders.reduce((sum, order) => sum + order.totalAmount, 0),
      orderCount: vendor.orders.length
    })).sort((a, b) => b.revenue - a.revenue)

    // Get alert counts
    const alertCounts = {
      systemHealth: systemHealth.filter(h => h.status !== 'healthy').length,
      pendingDisputes: pendingDisputes,
      failedPayments: await prisma.payment.count({
        where: {
          status: 'FAILED',
          createdAt: { gte: startDate }
        }
      }),
      lowStockProducts: await prisma.product.count({
        where: {
          isTrackingStock: true,
          stockQuantity: { lte: 10 }
        }
      })
    }

    // Get KPI comparisons (vs previous period)
    const previousPeriodStart = new Date(startDate.getTime() - (days * 24 * 60 * 60 * 1000))
    const previousPeriodEnd = startDate

    const [
      previousUsers,
      previousOrders,
      previousRevenue
    ] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: { gte: previousPeriodStart, lt: previousPeriodEnd }
        }
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: previousPeriodStart, lt: previousPeriodEnd }
        }
      }),
      prisma.order.aggregate({
        where: {
          status: 'DELIVERED',
          createdAt: { gte: previousPeriodStart, lt: previousPeriodEnd }
        },
        _sum: { totalAmount: true }
      })
    ])

    // Calculate growth percentages
    const userGrowthPercent = previousUsers > 0 ? 
      ((totalUsers - previousUsers) / previousUsers) * 100 : 0
    const orderGrowthPercent = previousOrders > 0 ? 
      ((recentOrders - previousOrders) / previousOrders) * 100 : 0
    const revenueGrowthPercent = (previousRevenue._sum.totalAmount || 0) > 0 ? 
      (((totalRevenue._sum.totalAmount || 0) - (previousRevenue._sum.totalAmount || 0)) / (previousRevenue._sum.totalAmount || 0)) * 100 : 0

    await logAdminAction(
      authResult.user.id,
      'VIEW_ADMIN_DASHBOARD',
      'dashboard',
      undefined,
      undefined,
      { timeRange },
      req
    )

    return NextResponse.json({
      overview: {
        totalUsers,
        totalOrders,
        totalVendors,
        totalDrivers,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalDisputes,
        activeUsers,
        recentOrders,
        pendingDisputes,
        systemHealthy: systemHealth.filter(h => h.status === 'healthy').length,
        totalServices: systemHealth.length
      },
      growth: {
        userGrowthPercent,
        orderGrowthPercent,
        revenueGrowthPercent
      },
      trends: {
        userGrowth,
        orderTrends
      },
      topVendors: vendorStats.slice(0, 5),
      recentActivity: recentActivity.slice(0, 10),
      alerts: {
        total: Object.values(alertCounts).reduce((sum, count) => sum + count, 0),
        ...alertCounts
      },
      systemHealth: systemHealth.map(h => ({
        service: h.component,
        status: h.status,
        responseTime: h.responseTime,
        uptime: h.uptime,
        timestamp: h.timestamp
      }))
    })
  } catch (error) {
    console.error('Error fetching admin dashboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
