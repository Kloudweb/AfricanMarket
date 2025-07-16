
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get notification preferences
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId: session.user.id }
    })

    // Return default preferences if none exist
    if (!preferences) {
      return NextResponse.json({
        preferences: {
          orderUpdates: true,
          preparationTime: true,
          driverAssigned: true,
          driverLocation: true,
          deliveryConfirmation: true,
          promotions: true,
          email: true,
          sms: false,
          push: true,
          realTimeUpdates: true,
          digest: false,
          digestFrequency: null,
          quietHours: false,
          quietStart: null,
          quietEnd: null
        }
      })
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update notification preferences
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await req.json()

    const updatedPreferences = await prisma.notificationPreferences.upsert({
      where: { userId: session.user.id },
      update: preferences,
      create: {
        userId: session.user.id,
        ...preferences
      }
    })

    return NextResponse.json({
      message: 'Notification preferences updated successfully',
      preferences: updatedPreferences
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
