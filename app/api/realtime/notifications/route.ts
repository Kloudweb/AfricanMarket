
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { InAppNotificationService } from '@/lib/in-app-notification-service'
import { NotificationOrchestrator } from '@/lib/notification-orchestrator'
import { authOptions } from '@/lib/auth'

const notificationSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  type: z.string().default('general'),
  data: z.object({}).passthrough().optional(),
  urgent: z.boolean().default(false),
  targetUserIds: z.array(z.string()).optional(),
  channels: z.array(z.enum(['email', 'sms', 'push', 'in_app'])).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true'

    const notifications = await InAppNotificationService.getNotifications(
      session.user.id,
      page,
      limit,
      unreadOnly
    )

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error getting notifications:', error)
    return NextResponse.json(
      { error: 'Failed to get notifications' },
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

    // Check if user has admin role for creating notifications
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, body: notificationBody, type, data, urgent, targetUserIds, channels } = notificationSchema.parse(body)

    if (targetUserIds && targetUserIds.length > 0) {
      // Send to specific users
      const results = await Promise.all(
        targetUserIds.map(async (userId) => {
          const notification = {
            userId,
            title,
            body: notificationBody,
            type,
            data,
            urgent
          }
          return await NotificationOrchestrator.sendNotification(notification, channels)
        })
      )
      return NextResponse.json({ results })
    } else {
      // Broadcast to all users
      const notification = {
        title,
        body: notificationBody,
        type,
        data,
        urgent
      }
      const result = await NotificationOrchestrator.broadcastNotification(notification, channels)
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}
