
// Push notification unregistration
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PushNotificationService } from '@/lib/push-notification-service'

export const dynamic = 'force-dynamic'

const pushService = new PushNotificationService()

// Unregister device token
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    await pushService.unregisterDeviceToken(token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unregistering device token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

