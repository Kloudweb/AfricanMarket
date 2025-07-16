
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get rideshare statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30' // days
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000)

    // Get total rides
    const totalRides = await prisma.ride.count({
      where: {
        createdAt: { gte: startDate }
      }
    })

    // Get completed rides
    const completedRides = await prisma.ride.count({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      }
    })

    // Get cancelled rides
    const cancelledRides = await prisma.ride.count({
      where: {
        status: 'CANCELLED',
        createdAt: { gte: startDate }
      }
    })

    // Get total revenue
    const revenueResult = await prisma.ride.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      },
      _sum: {
        actualFare: true
      }
    })

    const totalRevenue = revenueResult._sum.actualFare || 0

    // Get average rating
    const ratingResult = await prisma.review.aggregate({
      where: {
        ride: {
          createdAt: { gte: startDate }
        }
      },
      _avg: {
        rating: true
      }
    })

    const averageRating = ratingResult._avg.rating || 0

    // Get active drivers
    const activeDrivers = await prisma.driver.count({
      where: {
        isAvailable: true,
        totalRides: { gt: 0 }
      }
    })

    // Get rides by status
    const ridesByStatus = await prisma.ride.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: {
        id: true
      }
    })

    const statusCounts = ridesByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id
      return acc
    }, {} as Record<string, number>)

    // Get rides by type
    const ridesByType = await prisma.ride.groupBy({
      by: ['rideType'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: {
        id: true
      }
    })

    const typeCounts = ridesByType.reduce((acc, item) => {
      acc[item.rideType] = item._count.id
      return acc
    }, {} as Record<string, number>)

    // Calculate completion rate
    const completionRate = totalRides > 0 ? (completedRides / totalRides) * 100 : 0

    // Calculate cancellation rate
    const cancellationRate = totalRides > 0 ? (cancelledRides / totalRides) * 100 : 0

    // Get recent rides for trend analysis
    const recentRides = await prisma.ride.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      select: {
        id: true,
        status: true,
        rideType: true,
        actualFare: true,
        createdAt: true,
        completedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    })

    return NextResponse.json({
      success: true,
      period: parseInt(period),
      statistics: {
        totalRides,
        completedRides,
        cancelledRides,
        totalRevenue,
        averageRating,
        activeDrivers,
        completionRate,
        cancellationRate,
        statusCounts,
        typeCounts
      },
      recentRides: recentRides.slice(0, 20) // Return recent 20 rides
    })
  } catch (error) {
    console.error('Error fetching rideshare statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
