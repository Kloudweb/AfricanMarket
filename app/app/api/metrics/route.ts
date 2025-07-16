
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { systemMetrics, performanceMonitor } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow admin access to metrics
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    
    const response: any = {
      timestamp: new Date(),
      type
    }
    
    if (type === 'all' || type === 'system') {
      response.system = await systemMetrics.collectMetrics()
    }
    
    if (type === 'all' || type === 'performance') {
      response.performance = performanceMonitor.getAllMetrics()
    }
    
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to collect metrics',
      timestamp: new Date()
    }, { status: 500 })
  }
}
