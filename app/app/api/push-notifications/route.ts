
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Send push notification
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, title, body, data, orderId, rideId } = await req.json()

    // Check if user has permission to send notifications
    if (session.user.role !== 'ADMIN' && session.user.role !== 'VENDOR' && session.user.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check notification preferences
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    })

    if (!preferences?.push) {
      return NextResponse.json({ error: 'Push notifications disabled for user' }, { status: 400 })
    }

    // Check quiet hours
    if (preferences.quietHours && preferences.quietStart && preferences.quietEnd) {
      const now = new Date()
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
      
      if (currentTime >= preferences.quietStart && currentTime <= preferences.quietEnd) {
        return NextResponse.json({ error: 'Quiet hours active' }, { status: 400 })
      }
    }

    // Create notification record
    const notification = await prisma.pushNotification.create({
      data: {
        userId,
        title,
        body,
        data,
        orderId,
        rideId
      }
    })

    // TODO: Send actual push notification using service worker / FCM
    // For now, we'll just mark as sent
    await prisma.pushNotification.update({
      where: { id: notification.id },
      data: {
        sent: true,
        sentAt: new Date()
      }
    })

    return NextResponse.json({
      message: 'Push notification sent successfully',
      notification
    })
  } catch (error) {
    console.error('Error sending push notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get user's push notifications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const skip = (page - 1) * limit

    const notifications = await prisma.pushNotification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        }
      }
    })

    const totalNotifications = await prisma.pushNotification.count({
      where: { userId: session.user.id }
    })

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total: totalNotifications,
        pages: Math.ceil(totalNotifications / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching push notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
