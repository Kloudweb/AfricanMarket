
// Manage push notification subscriptions
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PushNotificationService } from '@/lib/push-notification-service'

export const dynamic = 'force-dynamic'

const pushService = new PushNotificationService()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscriptions - this would need to be implemented in the service
    const subscriptions = []

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error('Error getting subscriptions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

