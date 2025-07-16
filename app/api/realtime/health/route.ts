
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { SystemHealthMonitor } from '@/lib/system-health-monitor'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const health = await SystemHealthMonitor.getSystemHealth()
    return NextResponse.json(health)
  } catch (error) {
    console.error('Error getting system health:', error)
    return NextResponse.json(
      { error: 'Failed to get system health' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    let result
    switch (action) {
      case 'restart':
        result = await SystemHealthMonitor.restartService()
        break
      case 'clearCache':
        result = await SystemHealthMonitor.clearCache()
        break
      case 'runMaintenance':
        result = await SystemHealthMonitor.runMaintenance()
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error performing health action:', error)
    return NextResponse.json(
      { error: 'Failed to perform health action' },
      { status: 500 }
    )
  }
}
