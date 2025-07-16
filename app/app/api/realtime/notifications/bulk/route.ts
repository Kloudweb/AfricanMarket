
// Bulk notification operations
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { InAppNotificationService } from '@/lib/in-app-notification-service'

export const dynamic = 'force-dynamic'

const inAppService = new InAppNotificationService()

// Bulk update notifications
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, category } = await request.json()

    switch (action) {
      case 'mark_all_read':
        await inAppService.markAllAsRead(session.user.id, category)
        break
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error bulk updating notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

