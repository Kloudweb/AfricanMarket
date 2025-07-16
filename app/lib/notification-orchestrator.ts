
// Comprehensive notification orchestration system
import { prisma } from '@/lib/db'
import { NotificationPayload, NotificationChannel, DeliveryStatus } from '@/lib/types'
import { PushNotificationService } from './push-notification-service'
import { SmsNotificationService } from './sms-notification-service'
import { EmailNotificationService } from './email-notification-service'
import { InAppNotificationService } from './in-app-notification-service'
import { MessageQueueService } from './message-queue-service'

export class NotificationOrchestrator {
  
  // Static methods for API routes
  static async sendNotification(payload: NotificationPayload, channels?: string[]) {
    try {
      const defaultChannels = ['in_app', 'push']
      const targetChannels = channels || defaultChannels
      
      const results = []
      
      for (const channel of targetChannels) {
        switch (channel) {
          case 'in_app':
            const inAppService = new InAppNotificationService()
            results.push(await inAppService.sendNotification(payload))
            break
          case 'push':
            const pushService = new PushNotificationService()
            results.push(await pushService.sendNotification(payload))
            break
          case 'email':
            const emailService = new EmailNotificationService()
            results.push(await emailService.sendNotification(payload))
            break
          case 'sms':
            const smsService = new SmsNotificationService()
            results.push(await smsService.sendNotification(payload))
            break
        }
      }
      
      return { results }
    } catch (error) {
      console.error('Error sending notification:', error)
      throw error
    }
  }

  static async broadcastNotification(payload: any, channels?: string[]) {
    try {
      const defaultChannels = ['in_app', 'push']
      const targetChannels = channels || defaultChannels
      
      // Get all users
      const users = await prisma.user.findMany({
        select: { id: true }
      })
      
      const results = []
      
      for (const user of users) {
        const userPayload = {
          ...payload,
          userId: user.id
        }
        
        const result = await this.sendNotification(userPayload, targetChannels)
        results.push(result)
      }
      
      return { results }
    } catch (error) {
      console.error('Error broadcasting notification:', error)
      throw error
    }
  }
  private pushService: PushNotificationService
  private smsService: SmsNotificationService
  private emailService: EmailNotificationService
  private inAppService: InAppNotificationService
  private queueService: MessageQueueService

  constructor() {
    this.pushService = new PushNotificationService()
    this.smsService = new SmsNotificationService()
    this.emailService = new EmailNotificationService()
    this.inAppService = new InAppNotificationService()
    this.queueService = new MessageQueueService()
  }

  // Send notification through multiple channels
  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Get user notification preferences
      const preferences = await this.getUserNotificationPreferences(payload.userId!)
      
      // Check quiet hours
      if (this.isQuietHours(preferences)) {
        await this.scheduleNotification(payload, preferences)
        return
      }

      // Send through enabled channels
      const deliveryPromises: Promise<DeliveryStatus>[] = []

      if (preferences.pushEnabled) {
        deliveryPromises.push(this.pushService.sendNotification(payload))
      }

      if (preferences.emailEnabled) {
        deliveryPromises.push(this.emailService.sendNotification(payload))
      }

      if (preferences.smsEnabled && payload.urgent) {
        deliveryPromises.push(this.smsService.sendNotification(payload))
      }

      if (preferences.inAppEnabled) {
        deliveryPromises.push(this.inAppService.sendNotification(payload))
      }

      // Execute deliveries
      const deliveryStatuses = await Promise.allSettled(deliveryPromises)
      
      // Log delivery results
      await this.logDeliveryResults(payload, deliveryStatuses)

    } catch (error) {
      console.error('Error in notification orchestration:', error)
      throw error
    }
  }

  // Send bulk notifications
  async sendBulkNotifications(payloads: NotificationPayload[]): Promise<void> {
    try {
      const batchSize = 100
      for (let i = 0; i < payloads.length; i += batchSize) {
        const batch = payloads.slice(i, i + batchSize)
        await Promise.all(batch.map(payload => this.sendNotification(payload)))
      }
    } catch (error) {
      console.error('Error sending bulk notifications:', error)
      throw error
    }
  }

  // Send order notification
  async sendOrderNotification(orderId: string, type: string, customData?: any): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: true,
          driver: {
            include: {
              user: true
            }
          }
        }
      })

      if (!order) {
        throw new Error('Order not found')
      }

      const notifications = this.buildOrderNotifications(order, type, customData)
      
      for (const notification of notifications) {
        await this.sendNotification(notification)
      }
    } catch (error) {
      console.error('Error sending order notification:', error)
      throw error
    }
  }

  // Send ride notification
  async sendRideNotification(rideId: string, type: string, customData?: any): Promise<void> {
    try {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          customer: true,
          driver: {
            include: {
              user: true
            }
          }
        }
      })

      if (!ride) {
        throw new Error('Ride not found')
      }

      const notifications = this.buildRideNotifications(ride, type, customData)
      
      for (const notification of notifications) {
        await this.sendNotification(notification)
      }
    } catch (error) {
      console.error('Error sending ride notification:', error)
      throw error
    }
  }

  // Send marketing notification
  async sendMarketingNotification(userIds: string[], payload: NotificationPayload): Promise<void> {
    try {
      const notifications = userIds.map(userId => ({
        ...payload,
        userId,
        type: 'marketing'
      }))

      await this.sendBulkNotifications(notifications)
    } catch (error) {
      console.error('Error sending marketing notification:', error)
      throw error
    }
  }

  // Send system notification
  async sendSystemNotification(payload: NotificationPayload): Promise<void> {
    try {
      if (payload.userId) {
        await this.sendNotification(payload)
      } else {
        // Send to all users
        const users = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true }
        })

        const notifications = users.map(user => ({
          ...payload,
          userId: user.id,
          type: 'system'
        }))

        await this.sendBulkNotifications(notifications)
      }
    } catch (error) {
      console.error('Error sending system notification:', error)
      throw error
    }
  }

  // Get user notification preferences
  async getUserNotificationPreferences(userId: string): Promise<NotificationChannel> {
    try {
      let preferences = await prisma.notificationChannel.findUnique({
        where: { userId }
      })

      if (!preferences) {
        preferences = await prisma.notificationChannel.create({
          data: {
            userId,
            pushEnabled: true,
            emailEnabled: true,
            smsEnabled: false,
            inAppEnabled: true,
            orderUpdates: true,
            rideUpdates: true,
            paymentUpdates: true,
            marketingUpdates: false,
            systemUpdates: true,
            quietHours: false,
            realTime: true,
            digest: false,
            priority: 'NORMAL'
          }
        })
      }

      return preferences
    } catch (error) {
      console.error('Error getting notification preferences:', error)
      throw error
    }
  }

  // Update user notification preferences
  async updateNotificationPreferences(userId: string, updates: Partial<NotificationChannel>): Promise<NotificationChannel> {
    try {
      const preferences = await prisma.notificationChannel.upsert({
        where: { userId },
        create: {
          userId,
          ...updates
        },
        update: updates
      })

      return preferences
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      throw error
    }
  }

  // Get unread notifications
  async getUnreadNotifications(userId: string, limit: number = 50): Promise<any[]> {
    try {
      return await prisma.inAppNotification.findMany({
        where: {
          userId,
          isRead: false,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })
    } catch (error) {
      console.error('Error getting unread notifications:', error)
      return []
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.inAppNotification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  // Dismiss notification
  async dismissNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.inAppNotification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          isArchived: true,
          archivedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error dismissing notification:', error)
      throw error
    }
  }

  // Check if it's quiet hours
  private isQuietHours(preferences: NotificationChannel): boolean {
    if (!preferences.quietHours || !preferences.quietStart || !preferences.quietEnd) {
      return false
    }

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [startHour, startMinute] = preferences.quietStart.split(':').map(Number)
    const [endHour, endMinute] = preferences.quietEnd.split(':').map(Number)
    
    const startTime = startHour * 60 + startMinute
    const endTime = endHour * 60 + endMinute

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime <= endTime
    } else {
      return currentTime >= startTime || currentTime <= endTime
    }
  }

  // Schedule notification for later
  private async scheduleNotification(payload: NotificationPayload, preferences: NotificationChannel): Promise<void> {
    try {
      const scheduleFor = this.calculateScheduleTime(preferences)
      
      await this.queueService.enqueue('notifications', {
        type: 'scheduled_notification',
        payload,
        scheduleFor
      })
    } catch (error) {
      console.error('Error scheduling notification:', error)
      throw error
    }
  }

  // Calculate schedule time
  private calculateScheduleTime(preferences: NotificationChannel): Date {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    if (preferences.quietEnd) {
      const [endHour, endMinute] = preferences.quietEnd.split(':').map(Number)
      tomorrow.setHours(endHour, endMinute, 0, 0)
    }
    
    return tomorrow
  }

  // Build order notifications
  private buildOrderNotifications(order: any, type: string, customData?: any): NotificationPayload[] {
    const notifications: NotificationPayload[] = []

    const orderNotifications = {
      'order_placed': {
        customer: { title: 'Order Placed', body: `Your order #${order.orderNumber} has been placed` },
        vendor: { title: 'New Order', body: `New order #${order.orderNumber} received` }
      },
      'order_confirmed': {
        customer: { title: 'Order Confirmed', body: `Your order #${order.orderNumber} has been confirmed` }
      },
      'order_preparing': {
        customer: { title: 'Order Preparing', body: `Your order #${order.orderNumber} is being prepared` }
      },
      'order_ready': {
        customer: { title: 'Order Ready', body: `Your order #${order.orderNumber} is ready for pickup` }
      },
      'order_out_for_delivery': {
        customer: { title: 'Order Out for Delivery', body: `Your order #${order.orderNumber} is out for delivery` },
        driver: { title: 'New Delivery', body: `New delivery assignment for order #${order.orderNumber}` }
      },
      'order_delivered': {
        customer: { title: 'Order Delivered', body: `Your order #${order.orderNumber} has been delivered` }
      }
    }

    const typeNotifications = orderNotifications[type as keyof typeof orderNotifications]
    if (!typeNotifications) return notifications

    // Customer notification
    if (typeNotifications.customer) {
      notifications.push({
        userId: order.customerId,
        title: typeNotifications.customer.title,
        body: typeNotifications.customer.body,
        type: 'order',
        orderId: order.id,
        data: { ...customData, order }
      })
    }

    // Vendor notification
    if (typeNotifications.vendor) {
      notifications.push({
        userId: order.vendor.userId,
        title: typeNotifications.vendor.title,
        body: typeNotifications.vendor.body,
        type: 'order',
        orderId: order.id,
        vendorId: order.vendorId,
        data: { ...customData, order }
      })
    }

    // Driver notification
    if (typeNotifications.driver && order.driver) {
      notifications.push({
        userId: order.driver.userId,
        title: typeNotifications.driver.title,
        body: typeNotifications.driver.body,
        type: 'order',
        orderId: order.id,
        driverId: order.driverId,
        data: { ...customData, order }
      })
    }

    return notifications
  }

  // Build ride notifications
  private buildRideNotifications(ride: any, type: string, customData?: any): NotificationPayload[] {
    const notifications: NotificationPayload[] = []

    const rideNotifications = {
      'ride_requested': {
        customer: { title: 'Ride Requested', body: `Your ride request #${ride.rideNumber} has been submitted` }
      },
      'ride_accepted': {
        customer: { title: 'Ride Accepted', body: `Your ride #${ride.rideNumber} has been accepted` }
      },
      'driver_arriving': {
        customer: { title: 'Driver Arriving', body: `Your driver is arriving for ride #${ride.rideNumber}` }
      },
      'ride_started': {
        customer: { title: 'Ride Started', body: `Your ride #${ride.rideNumber} has started` }
      },
      'ride_completed': {
        customer: { title: 'Ride Completed', body: `Your ride #${ride.rideNumber} has been completed` }
      }
    }

    const typeNotifications = rideNotifications[type as keyof typeof rideNotifications]
    if (!typeNotifications) return notifications

    // Customer notification
    if (typeNotifications.customer) {
      notifications.push({
        userId: ride.customerId,
        title: typeNotifications.customer.title,
        body: typeNotifications.customer.body,
        type: 'ride',
        rideId: ride.id,
        data: { ...customData, ride }
      })
    }

    // Driver notification
    if (typeNotifications.driver && ride.driver) {
      notifications.push({
        userId: ride.driver.userId,
        title: typeNotifications.driver.title,
        body: typeNotifications.driver.body,
        type: 'ride',
        rideId: ride.id,
        driverId: ride.driverId,
        data: { ...customData, ride }
      })
    }

    return notifications
  }

  // Log delivery results
  private async logDeliveryResults(payload: NotificationPayload, deliveryStatuses: PromiseSettledResult<DeliveryStatus>[]): Promise<void> {
    try {
      for (const result of deliveryStatuses) {
        if (result.status === 'fulfilled') {
          console.log(`Notification delivered via ${result.value.channel}: ${result.value.status}`)
        } else {
          console.error(`Notification delivery failed: ${result.reason}`)
        }
      }
    } catch (error) {
      console.error('Error logging delivery results:', error)
    }
  }
}

