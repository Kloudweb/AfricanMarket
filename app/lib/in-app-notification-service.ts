
// In-app notification service
import { prisma } from '@/lib/db'
import { NotificationPayload, DeliveryStatus } from '@/lib/types'
import { webSocketService } from './comprehensive-websocket-service'

export class InAppNotificationService {
  
  // Static methods for API routes
  static async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ) {
    try {
      const notifications = await prisma.inAppNotification.findMany({
        where: {
          userId,
          ...(unreadOnly ? { readAt: null } : {})
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      })
      
      return notifications
    } catch (error) {
      console.error('Error getting notifications:', error)
      throw error
    }
  }

  static async getNotification(notificationId: string, userId: string) {
    try {
      const notification = await prisma.inAppNotification.findFirst({
        where: {
          id: notificationId,
          userId
        }
      })
      
      return notification
    } catch (error) {
      console.error('Error getting notification:', error)
      throw error
    }
  }

  static async markAsRead(notificationId: string, userId: string, read: boolean = true) {
    try {
      const notification = await prisma.inAppNotification.update({
        where: {
          id: notificationId,
          userId
        },
        data: {
          readAt: read ? new Date() : null
        }
      })
      
      return notification
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  static async deleteNotification(notificationId: string, userId: string) {
    try {
      await prisma.inAppNotification.delete({
        where: {
          id: notificationId,
          userId
        }
      })
      
      return { success: true }
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  }

  static async bulkMarkAsRead(notificationIds: string[], userId: string, read: boolean = true) {
    try {
      const result = await prisma.inAppNotification.updateMany({
        where: {
          id: {
            in: notificationIds
          },
          userId
        },
        data: {
          readAt: read ? new Date() : null
        }
      })
      
      return result
    } catch (error) {
      console.error('Error bulk marking notifications as read:', error)
      throw error
    }
  }

  static async bulkDelete(notificationIds: string[], userId: string) {
    try {
      const result = await prisma.inAppNotification.deleteMany({
        where: {
          id: {
            in: notificationIds
          },
          userId
        }
      })
      
      return result
    } catch (error) {
      console.error('Error bulk deleting notifications:', error)
      throw error
    }
  }

  static async getPreferences(userId: string) {
    try {
      const preferences = await prisma.notificationPreferences.findFirst({
        where: {
          userId
        }
      })
      
      return preferences || {
        email: true,
        push: true,
        sms: false,
        inApp: true,
        categories: {
          orders: true,
          deliveries: true,
          promotions: true,
          security: true,
          system: true
        }
      }
    } catch (error) {
      console.error('Error getting preferences:', error)
      throw error
    }
  }

  static async updatePreferences(userId: string, preferences: any) {
    try {
      const result = await prisma.notificationPreferences.upsert({
        where: {
          userId
        },
        update: preferences,
        create: {
          userId,
          ...preferences
        }
      })
      
      return result
    } catch (error) {
      console.error('Error updating preferences:', error)
      throw error
    }
  }
  // Send in-app notification
  async sendNotification(payload: NotificationPayload): Promise<DeliveryStatus> {
    try {
      // Create notification in database
      const notification = await prisma.inAppNotification.create({
        data: {
          userId: payload.userId!,
          title: payload.title,
          message: payload.body,
          type: payload.type,
          category: this.getNotificationCategory(payload.type),
          data: payload.data || {},
          imageUrl: payload.data?.imageUrl,
          iconUrl: payload.data?.iconUrl,
          actionUrl: payload.data?.actionUrl,
          actionText: payload.data?.actionText,
          priority: payload.urgent ? 'HIGH' : 'NORMAL',
          urgent: payload.urgent || false,
          expiresAt: payload.data?.expiresAt,
          orderId: payload.orderId,
          rideId: payload.rideId,
          vendorId: payload.vendorId,
          driverId: payload.driverId,
          metadata: payload.data
        }
      })

      // Send real-time notification if user is online
      if (webSocketService.isUserOnline(payload.userId!)) {
        webSocketService.emitToUser(payload.userId!, 'new_notification', {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          category: notification.category,
          priority: notification.priority,
          urgent: notification.urgent,
          createdAt: notification.createdAt,
          data: notification.data,
          imageUrl: notification.imageUrl,
          iconUrl: notification.iconUrl,
          actionUrl: notification.actionUrl,
          actionText: notification.actionText
        })
      }

      return {
        channel: 'in-app',
        status: 'DELIVERED',
        sentAt: new Date(),
        deliveredAt: new Date(),
        retryCount: 0
      }

    } catch (error) {
      console.error('Error sending in-app notification:', error)
      
      return {
        channel: 'in-app',
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0
      }
    }
  }

  // Get notification category
  private getNotificationCategory(type: string): string {
    const categoryMap: Record<string, string> = {
      'order': 'orders',
      'ride': 'rides',
      'payment': 'payments',
      'system': 'system',
      'marketing': 'marketing',
      'driver': 'rides',
      'vendor': 'orders'
    }

    return categoryMap[type] || 'system'
  }

  // Get user notifications
  async getUserNotifications(userId: string, options: {
    limit?: number
    offset?: number
    category?: string
    unreadOnly?: boolean
  } = {}): Promise<any[]> {
    try {
      const { limit = 50, offset = 0, category, unreadOnly = false } = options

      const where: any = {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }

      if (category) {
        where.category = category
      }

      if (unreadOnly) {
        where.isRead = false
      }

      return await prisma.inAppNotification.findMany({
        where,
        orderBy: [
          { urgent: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      })
    } catch (error) {
      console.error('Error getting user notifications:', error)
      return []
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
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

      // Send real-time update
      webSocketService.emitToUser(userId, 'notification_read', {
        notificationId,
        readAt: new Date()
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string, category?: string): Promise<void> {
    try {
      const where: any = {
        userId,
        isRead: false
      }

      if (category) {
        where.category = category
      }

      await prisma.inAppNotification.updateMany({
        where,
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      // Send real-time update
      webSocketService.emitToUser(userId, 'all_notifications_read', {
        category,
        readAt: new Date()
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  // Star notification
  async starNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.inAppNotification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          isStarred: true,
          starredAt: new Date()
        }
      })

      // Send real-time update
      webSocketService.emitToUser(userId, 'notification_starred', {
        notificationId,
        starredAt: new Date()
      })
    } catch (error) {
      console.error('Error starring notification:', error)
      throw error
    }
  }

  // Archive notification
  async archiveNotification(notificationId: string, userId: string): Promise<void> {
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

      // Send real-time update
      webSocketService.emitToUser(userId, 'notification_archived', {
        notificationId,
        archivedAt: new Date()
      })
    } catch (error) {
      console.error('Error archiving notification:', error)
      throw error
    }
  }

  // Get notification statistics
  async getNotificationStats(userId: string): Promise<any> {
    try {
      const stats = await prisma.inAppNotification.groupBy({
        by: ['category', 'isRead'],
        where: {
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        _count: {
          id: true
        }
      })

      const result: any = {
        total: 0,
        unread: 0,
        byCategory: {}
      }

      for (const stat of stats) {
        result.total += stat._count.id
        
        if (!stat.isRead) {
          result.unread += stat._count.id
        }

        if (!result.byCategory[stat.category]) {
          result.byCategory[stat.category] = { total: 0, unread: 0 }
        }

        result.byCategory[stat.category].total += stat._count.id
        
        if (!stat.isRead) {
          result.byCategory[stat.category].unread += stat._count.id
        }
      }

      return result
    } catch (error) {
      console.error('Error getting notification stats:', error)
      return { total: 0, unread: 0, byCategory: {} }
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

      if (!order) return

      const notifications = this.buildOrderNotifications(order, type, customData)
      
      for (const notification of notifications) {
        await this.sendNotification(notification)
      }
    } catch (error) {
      console.error('Error sending order notification:', error)
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

      if (!ride) return

      const notifications = this.buildRideNotifications(ride, type, customData)
      
      for (const notification of notifications) {
        await this.sendNotification(notification)
      }
    } catch (error) {
      console.error('Error sending ride notification:', error)
    }
  }

  // Build order notifications
  private buildOrderNotifications(order: any, type: string, customData?: any): NotificationPayload[] {
    const notifications: NotificationPayload[] = []

    const orderMessages = {
      'order_placed': {
        customer: { title: '🛍️ Order Placed', body: `Your order #${order.orderNumber} has been placed successfully!` },
        vendor: { title: '🔔 New Order', body: `New order #${order.orderNumber} from ${order.customer.name}` }
      },
      'order_confirmed': {
        customer: { title: '✅ Order Confirmed', body: `Great news! Your order #${order.orderNumber} has been confirmed and is being prepared.` }
      },
      'order_preparing': {
        customer: { title: '👨‍🍳 Order Preparing', body: `Your delicious meal is being prepared! Order #${order.orderNumber}` }
      },
      'order_ready': {
        customer: { title: '🎉 Order Ready', body: `Your order #${order.orderNumber} is ready for pickup!` }
      },
      'order_out_for_delivery': {
        customer: { title: '🚗 Out for Delivery', body: `Your order #${order.orderNumber} is on its way to you!` },
        driver: { title: '📦 New Delivery', body: `New delivery assignment for order #${order.orderNumber}` }
      },
      'order_delivered': {
        customer: { title: '🎊 Order Delivered', body: `Your order #${order.orderNumber} has been delivered. Enjoy your meal!` }
      }
    }

    const typeMessages = orderMessages[type as keyof typeof orderMessages]
    if (!typeMessages) return notifications

    // Customer notification
    if (typeMessages.customer) {
      notifications.push({
        userId: order.customerId,
        title: typeMessages.customer.title,
        body: typeMessages.customer.body,
        type: 'order',
        orderId: order.id,
        data: {
          ...customData,
          order,
          actionUrl: `/orders/${order.id}`,
          actionText: 'View Order'
        }
      })
    }

    // Vendor notification
    if (typeMessages.vendor) {
      notifications.push({
        userId: order.vendor.userId,
        title: typeMessages.vendor.title,
        body: typeMessages.vendor.body,
        type: 'order',
        orderId: order.id,
        vendorId: order.vendorId,
        data: {
          ...customData,
          order,
          actionUrl: `/vendor/orders/${order.id}`,
          actionText: 'Manage Order'
        }
      })
    }

    // Driver notification
    if (typeMessages.driver && order.driver) {
      notifications.push({
        userId: order.driver.userId,
        title: typeMessages.driver.title,
        body: typeMessages.driver.body,
        type: 'order',
        orderId: order.id,
        driverId: order.driverId,
        data: {
          ...customData,
          order,
          actionUrl: `/driver/deliveries/${order.id}`,
          actionText: 'View Delivery'
        }
      })
    }

    return notifications
  }

  // Build ride notifications
  private buildRideNotifications(ride: any, type: string, customData?: any): NotificationPayload[] {
    const notifications: NotificationPayload[] = []

    const rideMessages = {
      'ride_requested': {
        customer: { title: '🚗 Ride Requested', body: `Your ride request #${ride.rideNumber} has been submitted. Finding a driver...` }
      },
      'ride_accepted': {
        customer: { title: '✅ Ride Accepted', body: `Great! Your ride #${ride.rideNumber} has been accepted by ${ride.driver?.user?.name}` }
      },
      'driver_arriving': {
        customer: { title: '🚗 Driver Arriving', body: `Your driver ${ride.driver?.user?.name} is arriving at your location` }
      },
      'ride_started': {
        customer: { title: '🛣️ Ride Started', body: `Your ride #${ride.rideNumber} has started. Have a safe trip!` }
      },
      'ride_completed': {
        customer: { title: '🎉 Ride Completed', body: `Your ride #${ride.rideNumber} has been completed. Thanks for choosing us!` }
      }
    }

    const typeMessages = rideMessages[type as keyof typeof rideMessages]
    if (!typeMessages) return notifications

    // Customer notification
    if (typeMessages.customer) {
      notifications.push({
        userId: ride.customerId,
        title: typeMessages.customer.title,
        body: typeMessages.customer.body,
        type: 'ride',
        rideId: ride.id,
        data: {
          ...customData,
          ride,
          actionUrl: `/rides/${ride.id}`,
          actionText: 'View Ride'
        }
      })
    }

    // Driver notification
    if (typeMessages.driver && ride.driver) {
      notifications.push({
        userId: ride.driver.userId,
        title: typeMessages.driver.title,
        body: typeMessages.driver.body,
        type: 'ride',
        rideId: ride.id,
        driverId: ride.driverId,
        data: {
          ...customData,
          ride,
          actionUrl: `/driver/rides/${ride.id}`,
          actionText: 'View Ride'
        }
      })
    }

    return notifications
  }

  // Clean up old notifications
  async cleanupOldNotifications(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const result = await prisma.inAppNotification.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          isRead: true,
          isStarred: false
        }
      })

      console.log(`Cleaned up ${result.count} old in-app notifications`)
    } catch (error) {
      console.error('Error cleaning up old notifications:', error)
    }
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const result = await prisma.inAppNotification.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      })

      console.log(`Cleaned up ${result.count} expired in-app notifications`)
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error)
    }
  }
}

