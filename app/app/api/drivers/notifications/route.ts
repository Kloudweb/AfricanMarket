

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Create driver request notification
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      driverId,
      orderId,
      rideId,
      notificationType,
      title,
      message,
      data,
      priority = 'NORMAL',
      expiresAt,
      responseRequired = false 
    } = await req.json()

    // Validate required fields
    if (!driverId || !title || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: driverId, title, message' 
      }, { status: 400 })
    }

    // Get driver settings for notification preferences
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { driverSettings: true }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    // Check if driver is available for notifications
    if (!driver.isAvailable && notificationType !== 'SYSTEM_ALERT') {
      return NextResponse.json({ 
        error: 'Driver is not available for notifications' 
      }, { status: 400 })
    }

    // Check quiet hours
    const now = new Date()
    const settings = driver.driverSettings
    if (settings?.quietHoursEnabled && settings.quietHoursStart && settings.quietHoursEnd) {
      const currentTime = now.toTimeString().slice(0, 5)
      const isQuietHour = (currentTime >= settings.quietHoursStart || 
                          currentTime <= settings.quietHoursEnd)
      
      if (isQuietHour && priority !== 'HIGH') {
        return NextResponse.json({ 
          error: 'Driver is in quiet hours' 
        }, { status: 400 })
      }
    }

    // Create notification
    const notification = await prisma.driverRequestNotification.create({
      data: {
        driverId,
        orderId,
        rideId,
        notificationType,
        title,
        message,
        data: data || null,
        priority,
        soundEnabled: settings?.enableSoundAlerts ?? true,
        vibrationEnabled: settings?.enableVibration ?? true,
        responseRequired,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    })

    // Send push notification if enabled
    if (settings?.enablePushNotifications !== false) {
      // This would integrate with your push notification service
      // await pushNotificationService.sendToDriver(driver, notification)
    }

    // Send real-time notification via Socket.io
    // socketService.sendToDriver(driverId, 'new_notification', notification)

    return NextResponse.json({
      message: 'Notification sent successfully',
      notification: {
        id: notification.id,
        title: notification.title,
        createdAt: notification.createdAt,
        expiresAt: notification.expiresAt
      }
    })
  } catch (error) {
    console.error('Error sending driver notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get driver notifications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const notificationType = searchParams.get('type')

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const where: any = {
      driverId: driver.id
    }

    if (unreadOnly) {
      where.readAt = null
    }

    if (notificationType) {
      where.notificationType = notificationType
    }

    const [notifications, total] = await Promise.all([
      prisma.driverRequestNotification.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              vendor: {
                select: {
                  businessName: true,
                  address: true
                }
              }
            }
          },
          ride: {
            select: {
              id: true,
              rideNumber: true,
              estimatedFare: true,
              pickupAddress: true,
              destinationAddress: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.driverRequestNotification.count({ where })
    ])

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching driver notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Mark notification as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationId, action } = await req.json()

    if (!notificationId || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: notificationId, action' 
      }, { status: 400 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const notification = await prisma.driverRequestNotification.findUnique({
      where: { id: notificationId }
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    if (notification.driverId !== driver.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updateData: any = {}

    if (action === 'read') {
      updateData.readAt = new Date()
    } else if (action === 'respond') {
      const { response } = await req.json()
      updateData.respondedAt = new Date()
      updateData.response = response
    }

    const updatedNotification = await prisma.driverRequestNotification.update({
      where: { id: notificationId },
      data: updateData
    })

    return NextResponse.json({
      message: `Notification ${action} successfully`,
      notification: updatedNotification
    })
  } catch (error) {
    console.error('Error updating driver notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
