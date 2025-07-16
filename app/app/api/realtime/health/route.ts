
// System health API
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { systemHealthMonitor } from '@/lib/system-health-monitor'

export const dynamic = 'force-dynamic'

// Get system health status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Allow public access to basic health check
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'

    if (detailed && (!session?.user?.id || session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const healthStatus = await systemHealthMonitor.getHealthStatus()

    if (detailed) {
      const alerts = await systemHealthMonitor.getSystemAlerts()
      return NextResponse.json({ ...healthStatus, alerts })
    }

    return NextResponse.json({ status: healthStatus.overall })
  } catch (error) {
    console.error('Error getting health status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

