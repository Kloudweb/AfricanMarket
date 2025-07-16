
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { InAppNotificationService } from '@/lib/in-app-notification-service'
import { authOptions } from '@/lib/auth'

const bulkActionSchema = z.object({
  action: z.enum(['mark_read', 'mark_unread', 'delete']),
  notificationIds: z.array(z.string()).min(1)
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, notificationIds } = bulkActionSchema.parse(body)

    let result
    switch (action) {
      case 'mark_read':
        result = await InAppNotificationService.bulkMarkAsRead(
          notificationIds,
          session.user.id,
          true
        )
        break
      case 'mark_unread':
        result = await InAppNotificationService.bulkMarkAsRead(
          notificationIds,
          session.user.id,
          false
        )
        break
      case 'delete':
        result = await InAppNotificationService.bulkDelete(
          notificationIds,
          session.user.id
        )
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error performing bulk action:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    )
  }
}
