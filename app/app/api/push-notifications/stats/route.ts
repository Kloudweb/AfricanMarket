
// Push notification statistics
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PushNotificationService } from '@/lib/push-notification-service'

export const dynamic = 'force-dynamic'

const pushService = new PushNotificationService()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get basic stats - this would need to be implemented in the service
    const stats = {
      totalDevices: 0,
      activeDevices: 0,
      totalNotifications: 0,
      deliveredNotifications: 0,
      platforms: {}
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error getting push notification stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

