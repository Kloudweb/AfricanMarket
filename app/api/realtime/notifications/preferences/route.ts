
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { InAppNotificationService } from '@/lib/in-app-notification-service'
import { authOptions } from '@/lib/auth'

const preferencesSchema = z.object({
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  sms: z.boolean().default(false),
  inApp: z.boolean().default(true),
  categories: z.object({
    orders: z.boolean().default(true),
    deliveries: z.boolean().default(true),
    promotions: z.boolean().default(true),
    security: z.boolean().default(true),
    system: z.boolean().default(true)
  }).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await InAppNotificationService.getPreferences(session.user.id)
    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Error getting preferences:', error)
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const preferences = preferencesSchema.parse(body)

    const result = await InAppNotificationService.updatePreferences(
      session.user.id,
      preferences
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
