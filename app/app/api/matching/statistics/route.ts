
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { matchingService } from '@/lib/matching-service'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get matching statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')
    const driverId = searchParams.get('driverId')

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const endDate = new Date()

    // Get matching statistics
    const stats = await matchingService.getMatchingStatistics({
      start: startDate,
      end: endDate
    })

    // Get driver-specific statistics if requested
    let driverStats = null
    if (driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        include: {
          user: {
            select: {
              name: true
            }
          },
          performanceMetrics: {
            where: {
              period: 'weekly',
              periodStart: { gte: startDate }
            },
            orderBy: { periodStart: 'desc' },
            take: 1
          },
          availabilityStatus: {
            where: {
              startTime: { gte: startDate }
            },
            orderBy: { startTime: 'desc' }
          }
        }
      })

      if (driver) {
        const assignments = await prisma.matchingAssignment.findMany({
          where: {
            driverId,
            assignedAt: { gte: startDate, lte: endDate }
          }
        })

        const totalOnlineTime = driver.availabilityStatus
          .filter(status => status.status === 'ONLINE' || status.status === 'AVAILABLE')
          .reduce((sum, status) => {
            const endTime = status.endTime || new Date()
            return sum + (endTime.getTime() - status.startTime.getTime())
          }, 0)

        driverStats = {
          driver: {
            id: driver.id,
            rating: driver.rating,
            totalDeliveries: driver.totalDeliveries,
            totalRides: driver.totalRides,
            user: {
              name: driver.user?.name
            }
          },
          assignments: assignments.length,
          accepted: assignments.filter(a => a.status === 'ACCEPTED').length,
          rejected: assignments.filter(a => a.status === 'REJECTED').length,
          acceptanceRate: assignments.length > 0 ? 
            (assignments.filter(a => a.status === 'ACCEPTED').length / assignments.length) * 100 : 0,
          avgResponseTime: assignments.filter(a => a.responseTime).length > 0 ? 
            assignments.filter(a => a.responseTime).reduce((sum, a) => sum + a.responseTime!, 0) / 
            assignments.filter(a => a.responseTime).length : 0,
          avgScore: assignments.length > 0 ? 
            assignments.reduce((sum, a) => sum + a.totalScore, 0) / assignments.length : 0,
          onlineTime: Math.floor(totalOnlineTime / 1000 / 60), // in minutes
          performanceMetrics: driver.performanceMetrics[0] || null
        }
      }
    }

    // Get system performance metrics
    const systemMetrics = await prisma.systemPerformanceMetrics.findMany({
      where: {
        timestamp: { gte: startDate, lte: endDate }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    })

    return NextResponse.json({
      success: true,
      timeRange: {
        start: startDate,
        end: endDate,
        days
      },
      matchingStats: stats,
      driverStats,
      systemMetrics
    })
  } catch (error) {
    console.error('Error getting matching statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
