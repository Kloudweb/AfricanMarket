
// Notification management API
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { NotificationOrchestrator } from '@/lib/notification-orchestrator'
import { InAppNotificationService } from '@/lib/in-app-notification-service'

export const dynamic = 'force-dynamic'

const orchestrator = new NotificationOrchestrator()
const inAppService = new InAppNotificationService()

// Get user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const category = searchParams.get('category') || undefined
    const unreadOnly = searchParams.get('unread') === 'true'

    const notifications = await inAppService.getUserNotifications(session.user.id, {
      limit,
      offset,
      category,
      unreadOnly
    })

    const stats = await inAppService.getNotificationStats(session.user.id)

    return NextResponse.json({
      notifications,
      stats,
      pagination: {
        limit,
        offset,
        total: stats.total
      }
    })
  } catch (error) {
    console.error('Error getting notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Send notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, body, type, data, urgent, recipients } = await request.json()

    if (!title || !body || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Send to recipients or just to current user
    const targetUsers = recipients || [session.user.id]

    for (const userId of targetUsers) {
      await orchestrator.sendNotification({
        userId,
        title,
        body,
        type,
        data,
        urgent: urgent || false
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

