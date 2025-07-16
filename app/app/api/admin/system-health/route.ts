
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get system health status
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canSystemHealth')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    const service = searchParams.get('service')

    // Calculate time range
    const now = new Date()
    const timeRangeMap = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }
    const startTime = new Date(now.getTime() - timeRangeMap[timeRange as keyof typeof timeRangeMap])

    const where: any = {
      timestamp: {
        gte: startTime
      }
    }
    
    if (service) where.component = service

    // Get system health data
    const healthData = await prisma.systemHealth.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 1000
    })

    // Get latest status for each service
    const latestStatus = await prisma.systemHealth.findMany({
      where: {
        timestamp: {
          gte: new Date(now.getTime() - 5 * 60 * 1000) // Last 5 minutes
        }
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['component']
    })

    // Calculate service statistics
    const serviceStats = await prisma.systemHealth.groupBy({
      by: ['component'],
      where,
      _count: {
        component: true
      },
      _avg: {
        responseTime: true,
        uptime: true,
        errorRate: true,
        cpuUsage: true,
        memoryUsage: true,
        diskUsage: true
      }
    })

    // Get active alerts
    const alerts = await prisma.systemHealth.findMany({
      where: {
        status: {
          in: ['degraded', 'down']
        },
        timestamp: {
          gte: new Date(now.getTime() - 60 * 60 * 1000) // Last hour
        }
      },
      orderBy: { timestamp: 'desc' }
    })

    // Overall system status
    const overallStatus = calculateOverallStatus(latestStatus)

    // Performance metrics
    const performanceMetrics = {
      avgResponseTime: serviceStats.reduce((sum, stat) => sum + (stat._avg.responseTime || 0), 0) / serviceStats.length,
      avgUptime: serviceStats.reduce((sum, stat) => sum + (stat._avg.uptime || 0), 0) / serviceStats.length,
      avgErrorRate: serviceStats.reduce((sum, stat) => sum + (stat._avg.errorRate || 0), 0) / serviceStats.length,
      avgCpuUsage: serviceStats.reduce((sum, stat) => sum + (stat._avg.cpuUsage || 0), 0) / serviceStats.length,
      avgMemoryUsage: serviceStats.reduce((sum, stat) => sum + (stat._avg.memoryUsage || 0), 0) / serviceStats.length,
      avgDiskUsage: serviceStats.reduce((sum, stat) => sum + (stat._avg.diskUsage || 0), 0) / serviceStats.length
    }

    await logAdminAction(
      authResult.user.id,
      'VIEW_SYSTEM_HEALTH',
      'system_health',
      undefined,
      undefined,
      { timeRange, service },
      req
    )

    return NextResponse.json({
      overview: {
        status: overallStatus,
        totalServices: latestStatus.length,
        healthyServices: latestStatus.filter(s => s.status === 'healthy').length,
        degradedServices: latestStatus.filter(s => s.status === 'degraded').length,
        downServices: latestStatus.filter(s => s.status === 'down').length,
        activeAlerts: alerts.length
      },
      services: latestStatus,
      metrics: performanceMetrics,
      alerts,
      stats: serviceStats,
      timeline: healthData
    })
  } catch (error) {
    console.error('Error fetching system health:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Report system health status
export async function POST(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canSystemHealth')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const healthData = await req.json()

    const healthRecord = await prisma.systemHealth.create({
      data: {
        component: healthData.service,
        status: healthData.status,
        responseTime: healthData.responseTime,
        uptime: healthData.uptime,
        errorRate: healthData.errorRate,
        cpuUsage: healthData.cpuUsage,
        memoryUsage: healthData.memoryUsage,
        diskUsage: healthData.diskUsage,
        activeConnections: healthData.activeConnections,
        messagesSent: healthData.messagesSent,
        messagesQueued: healthData.messagesQueued,
        details: healthData.details
      }
    })

    await logAdminAction(
      authResult.user.id,
      'REPORT_SYSTEM_HEALTH',
      'system_health',
      healthRecord.id,
      undefined,
      healthData,
      req
    )

    return NextResponse.json({
      message: 'System health reported successfully',
      healthRecord
    })
  } catch (error) {
    console.error('Error reporting system health:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate overall status
function calculateOverallStatus(services: any[]) {
  if (services.length === 0) return 'unknown'
  
  const downServices = services.filter(s => s.status === 'down').length
  const degradedServices = services.filter(s => s.status === 'degraded').length
  
  if (downServices > 0) return 'down'
  if (degradedServices > 0) return 'degraded'
  return 'healthy'
}
