
// Push notification registration
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PushNotificationService } from '@/lib/push-notification-service'

export const dynamic = 'force-dynamic'

const pushService = new PushNotificationService()

// Register device token
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token, platform, deviceId, deviceName, appVersion, osVersion } = await request.json()

    if (!token || !platform) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await pushService.registerDeviceToken({
      userId: session.user.id,
      token,
      platform,
      deviceId,
      deviceName,
      appVersion,
      osVersion
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error registering device token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

