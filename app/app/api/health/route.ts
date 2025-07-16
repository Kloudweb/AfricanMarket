
import { NextRequest, NextResponse } from 'next/server'
import { healthCheck, systemMetrics } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'
    const metrics = searchParams.get('metrics') === 'true'
    
    // Get system health
    const health = await healthCheck.getSystemHealth()
    
    // Prepare response
    const response: any = {
      status: health.status,
      timestamp: health.timestamp,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
    
    // Add detailed health check results if requested
    if (detailed) {
      response.checks = health.checks
    }
    
    // Add system metrics if requested
    if (metrics) {
      response.metrics = await systemMetrics.collectMetrics()
    }
    
    // Return appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503
    
    return NextResponse.json(response, { status: statusCode })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date()
    }, { status: 503 })
  }
}
