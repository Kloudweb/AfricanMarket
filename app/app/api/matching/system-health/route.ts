
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get system health metrics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const startTime = Date.now()

    // Test database connection
    const dbStartTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbResponseTime = Date.now() - dbStartTime

    // Get system statistics
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Active drivers
    const activeDrivers = await prisma.driver.count({
      where: {
        isAvailable: true,
        verificationStatus: 'VERIFIED'
      }
    })

    // Online drivers (with recent activity)
    const onlineDrivers = await prisma.driverAvailabilityStatus.count({
      where: {
        status: { in: ['ONLINE', 'AVAILABLE'] },
        startTime: { gte: oneHourAgo },
        endTime: null
      }
    })

    // Recent assignments
    const recentAssignments = await prisma.matchingAssignment.findMany({
      where: {
        assignedAt: { gte: oneHourAgo }
      }
    })

    const assignmentStats = {
      total: recentAssignments.length,
      accepted: recentAssignments.filter(a => a.status === 'ACCEPTED').length,
      rejected: recentAssignments.filter(a => a.status === 'REJECTED').length,
      pending: recentAssignments.filter(a => a.status === 'PENDING').length,
      expired: recentAssignments.filter(a => a.status === 'EXPIRED').length
    }

    // Reassignment queue
    const queueStats = await prisma.reassignmentQueue.groupBy({
      by: ['status'],
      _count: { id: true }
    })

    const reassignmentQueue = {
      pending: queueStats.find(s => s.status === 'PENDING')?._count.id || 0,
      processing: queueStats.find(s => s.status === 'PROCESSING')?._count.id || 0,
      failed: queueStats.find(s => s.status === 'FAILED')?._count.id || 0
    }

    // System performance
    const avgResponseTime = recentAssignments.filter(a => a.responseTime).length > 0 ? 
      recentAssignments.filter(a => a.responseTime).reduce((sum, a) => sum + a.responseTime!, 0) / 
      recentAssignments.filter(a => a.responseTime).length : 0

    const acceptanceRate = assignmentStats.total > 0 ? 
      (assignmentStats.accepted / assignmentStats.total) * 100 : 0

    // Recent system performance metrics
    const systemMetrics = await prisma.systemPerformanceMetrics.findFirst({
      orderBy: { timestamp: 'desc' }
    })

    const apiResponseTime = Date.now() - startTime

    // System health score (0-100)
    let healthScore = 100
    if (dbResponseTime > 1000) healthScore -= 20
    if (activeDrivers < 10) healthScore -= 15
    if (acceptanceRate < 70) healthScore -= 15
    if (reassignmentQueue.pending > 10) healthScore -= 10
    if (reassignmentQueue.failed > 5) healthScore -= 10

    const healthStatus = healthScore >= 90 ? 'HEALTHY' : 
                        healthScore >= 70 ? 'WARNING' : 'CRITICAL'

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      healthStatus,
      healthScore,
      performance: {
        dbResponseTime,
        apiResponseTime,
        avgAssignmentResponseTime: avgResponseTime,
        acceptanceRate
      },
      drivers: {
        total: await prisma.driver.count(),
        active: activeDrivers,
        online: onlineDrivers,
        utilization: activeDrivers > 0 ? (onlineDrivers / activeDrivers) * 100 : 0
      },
      assignments: assignmentStats,
      reassignmentQueue,
      systemMetrics
    })
  } catch (error) {
    console.error('Error getting system health:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      healthStatus: 'CRITICAL',
      healthScore: 0
    }, { status: 500 })
  }
}

// Record system performance metrics
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const {
      totalAssignments,
      successfulAssignments,
      failedAssignments,
      avgMatchingTime,
      totalActiveDrivers,
      totalAvailableDrivers,
      avgDriverUtilization,
      avgResponseTime,
      avgAcceptanceRate,
      avgCustomerRating,
      avgWaitTime,
      systemLoad,
      databaseResponseTime,
      apiResponseTime
    } = body

    // Create system performance metrics record
    const metrics = await prisma.systemPerformanceMetrics.create({
      data: {
        totalAssignments: totalAssignments || 0,
        successfulAssignments: successfulAssignments || 0,
        failedAssignments: failedAssignments || 0,
        avgMatchingTime: avgMatchingTime || 0,
        totalActiveDrivers: totalActiveDrivers || 0,
        totalAvailableDrivers: totalAvailableDrivers || 0,
        avgDriverUtilization: avgDriverUtilization || 0,
        avgResponseTime: avgResponseTime || 0,
        avgAcceptanceRate: avgAcceptanceRate || 0,
        avgCustomerRating: avgCustomerRating || 0,
        avgWaitTime: avgWaitTime || 0,
        systemLoad: systemLoad || 0,
        databaseResponseTime: databaseResponseTime || 0,
        apiResponseTime: apiResponseTime || 0
      }
    })

    return NextResponse.json({
      success: true,
      metrics,
      message: 'System performance metrics recorded successfully'
    })
  } catch (error) {
    console.error('Error recording system performance metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
