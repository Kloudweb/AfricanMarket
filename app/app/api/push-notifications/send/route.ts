
// Send push notification
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PushNotificationService } from '@/lib/push-notification-service'

export const dynamic = 'force-dynamic'

const pushService = new PushNotificationService()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, body, type, data, urgent } = await request.json()

    if (!title || !body || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await pushService.sendNotification({
      userId: session.user.id,
      title,
      body,
      type,
      data,
      urgent: urgent || false
    })

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Error sending push notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

