
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { PushNotificationService } from '@/lib/push-notification-service'
import { authOptions } from '@/lib/auth'

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  }),
  deviceInfo: z.object({
    userAgent: z.string(),
    platform: z.string(),
    language: z.string()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const subscriptionData = subscriptionSchema.parse(body)

    const result = await PushNotificationService.registerDevice(
      session.user.id,
      subscriptionData.endpoint,
      subscriptionData.keys,
      subscriptionData.deviceInfo
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error registering push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to register push subscription' },
      { status: 500 }
    )
  }
}
