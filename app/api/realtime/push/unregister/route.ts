
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { PushNotificationService } from '@/lib/push-notification-service'
import { authOptions } from '@/lib/auth'

const unsubscribeSchema = z.object({
  endpoint: z.string().url()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint } = unsubscribeSchema.parse(body)

    const result = await PushNotificationService.unregisterDevice(
      session.user.id,
      endpoint
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error unregistering push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to unregister push subscription' },
      { status: 500 }
    )
  }
}
