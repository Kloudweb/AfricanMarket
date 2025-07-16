
// Get VAPID key for push notifications
import { NextRequest, NextResponse } from 'next/server'
import { PushNotificationService } from '@/lib/push-notification-service'

export const dynamic = 'force-dynamic'

const pushService = new PushNotificationService()

export async function GET(request: NextRequest) {
  try {
    const vapidKey = process.env.VAPID_PUBLIC_KEY || ''
    
    if (!vapidKey) {
      return NextResponse.json({ error: 'VAPID key not configured' }, { status: 500 })
    }

    return NextResponse.json({ vapidKey })
  } catch (error) {
    console.error('Error getting VAPID key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

