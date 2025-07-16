
import { prisma } from '@/lib/db'
import { realtimeService } from '@/lib/realtime'

export type NotificationType = 
  | 'ORDER_PLACED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVED'
  | 'ORDER_PICKED_UP'
  | 'ORDER_OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'PREPARATION_TIME_UPDATED'
  | 'DRIVER_LOCATION_UPDATE'

export interface NotificationData {
  type: NotificationType
  userId: string
  title: string
  message: string
  orderId?: string
  rideId?: string
  data?: any
}

export class NotificationService {
  private static instance: NotificationService

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  // Send notification to user
  async sendNotification(notification: NotificationData) {
    try {
      // Check user notification preferences
      const preferences = await prisma.notificationPreferences.findUnique({
        where: { userId: notification.userId }
      })

      if (!preferences) {
        // Create default preferences
        await prisma.notificationPreferences.create({
          data: {
            userId: notification.userId
          }
        })
      }

      // Check if notifications are enabled
      const isEnabled = this.isNotificationEnabled(notification.type, preferences)
      if (!isEnabled) {
        return
      }

      // Check quiet hours
      if (preferences?.quietHours && this.isQuietHours(preferences)) {
        return
      }

      // Send push notification
      if (preferences?.push !== false) {
        await this.sendPushNotification(notification)
      }

      // Send email notification
      if (preferences?.email && this.shouldSendEmail(notification.type)) {
        await this.sendEmailNotification(notification)
      }

      // Send SMS notification
      if (preferences?.sms && this.shouldSendSMS(notification.type)) {
        await this.sendSMSNotification(notification)
      }

      // Send real-time notification
      realtimeService.sendNotification(
        notification.userId,
        notification.title,
        notification.message,
        notification.data
      )

      // Save notification to database
      await prisma.notification.create({
        data: {
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          orderId: notification.orderId,
          rideId: notification.rideId
        }
      })
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  // Send order-related notifications
  async sendOrderNotification(orderId: string, type: NotificationType, customMessage?: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          vendor: { select: { businessName: true, userId: true } },
          driver: { 
            include: { 
              user: { select: { name: true } },
              locations: {
                where: { isOnline: true },
                orderBy: { timestamp: 'desc' },
                take: 1
              }
            }
          }
        }
      })

      if (!order) return

      const notifications = this.getOrderNotificationTemplates(type, order, customMessage)
      
      for (const notification of notifications) {
        await this.sendNotification(notification)
      }
    } catch (error) {
      console.error('Error sending order notification:', error)
    }
  }

  // Send driver assignment notification
  async sendDriverAssignmentNotification(driverId: string, orderId: string) {
    try {
      const assignment = await prisma.driverAssignment.findFirst({
        where: { driverId, orderId },
        include: {
          order: {
            include: {
              vendor: { select: { businessName: true, address: true } },
              items: {
                include: {
                  product: { select: { name: true } }
                }
              }
            }
          },
          driver: { select: { userId: true } }
        }
      })

      if (!assignment) return

      const notification: NotificationData = {
        type: 'DRIVER_ASSIGNED',
        userId: assignment.driver.userId,
        title: 'New Delivery Assignment',
        message: `You have a new delivery from ${assignment.order.vendor.businessName}`,
        orderId,
        data: {
          assignmentId: assignment.id,
          pickupAddress: assignment.order.vendor.address,
          deliveryAddress: assignment.order.deliveryAddress,
          eta: assignment.eta,
          items: assignment.order.items.map(item => ({
            name: item.product.name,
            quantity: item.quantity
          }))
        }
      }

      await this.sendNotification(notification)
    } catch (error) {
      console.error('Error sending driver assignment notification:', error)
    }
  }

  // Check if notification type is enabled
  private isNotificationEnabled(type: NotificationType, preferences: any): boolean {
    if (!preferences) return true

    switch (type) {
      case 'ORDER_PLACED':
      case 'ORDER_CONFIRMED':
      case 'ORDER_PREPARING':
      case 'ORDER_READY':
      case 'ORDER_PICKED_UP':
      case 'ORDER_OUT_FOR_DELIVERY':
      case 'ORDER_DELIVERED':
      case 'ORDER_CANCELLED':
        return preferences.orderUpdates !== false
      case 'PREPARATION_TIME_UPDATED':
        return preferences.preparationTime !== false
      case 'DRIVER_ASSIGNED':
      case 'DRIVER_ARRIVED':
        return preferences.driverAssigned !== false
      case 'DRIVER_LOCATION_UPDATE':
        return preferences.driverLocation !== false
      default:
        return true
    }
  }

  // Check if it's quiet hours
  private isQuietHours(preferences: any): boolean {
    if (!preferences.quietHours || !preferences.quietStart || !preferences.quietEnd) {
      return false
    }

    const now = new Date()
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
    
    return currentTime >= preferences.quietStart && currentTime <= preferences.quietEnd
  }

  // Check if email should be sent for this notification type
  private shouldSendEmail(type: NotificationType): boolean {
    const emailTypes: NotificationType[] = [
      'ORDER_PLACED',
      'ORDER_CONFIRMED',
      'ORDER_DELIVERED',
      'ORDER_CANCELLED'
    ]
    return emailTypes.includes(type)
  }

  // Check if SMS should be sent for this notification type
  private shouldSendSMS(type: NotificationType): boolean {
    const smsTypes: NotificationType[] = [
      'DRIVER_ASSIGNED',
      'ORDER_OUT_FOR_DELIVERY',
      'ORDER_DELIVERED'
    ]
    return smsTypes.includes(type)
  }

  // Send push notification
  private async sendPushNotification(notification: NotificationData) {
    try {
      await prisma.pushNotification.create({
        data: {
          userId: notification.userId,
          title: notification.title,
          body: notification.message,
          data: notification.data,
          orderId: notification.orderId,
          rideId: notification.rideId,
          sent: true,
          sentAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error sending push notification:', error)
    }
  }

  // Send email notification
  private async sendEmailNotification(notification: NotificationData) {
    // TODO: Implement email sending
    console.log('Email notification:', notification)
  }

  // Send SMS notification
  private async sendSMSNotification(notification: NotificationData) {
    // TODO: Implement SMS sending
    console.log('SMS notification:', notification)
  }

  // Get notification templates for different order events
  private getOrderNotificationTemplates(type: NotificationType, order: any, customMessage?: string): NotificationData[] {
    const notifications: NotificationData[] = []

    switch (type) {
      case 'ORDER_PLACED':
        notifications.push({
          type,
          userId: order.vendor.userId,
          title: 'New Order Received',
          message: `You have a new order #${order.orderNumber}`,
          orderId: order.id
        })
        break

      case 'ORDER_CONFIRMED':
        notifications.push({
          type,
          userId: order.customerId,
          title: 'Order Confirmed',
          message: customMessage || `Your order #${order.orderNumber} has been confirmed by ${order.vendor.businessName}`,
          orderId: order.id
        })
        break

      case 'ORDER_PREPARING':
        notifications.push({
          type,
          userId: order.customerId,
          title: 'Order Being Prepared',
          message: customMessage || `${order.vendor.businessName} is preparing your order #${order.orderNumber}`,
          orderId: order.id
        })
        break

      case 'ORDER_READY':
        notifications.push({
          type,
          userId: order.customerId,
          title: 'Order Ready',
          message: customMessage || `Your order #${order.orderNumber} is ready for pickup`,
          orderId: order.id
        })
        break

      case 'DRIVER_ASSIGNED':
        notifications.push({
          type,
          userId: order.customerId,
          title: 'Driver Assigned',
          message: `${order.driver?.user?.name || 'A driver'} has been assigned to deliver your order #${order.orderNumber}`,
          orderId: order.id,
          data: {
            driverName: order.driver?.user?.name,
            driverLocation: order.driver?.locations?.[0]
          }
        })
        break

      case 'ORDER_OUT_FOR_DELIVERY':
        notifications.push({
          type,
          userId: order.customerId,
          title: 'Order Out for Delivery',
          message: `Your order #${order.orderNumber} is on the way!`,
          orderId: order.id
        })
        break

      case 'ORDER_DELIVERED':
        notifications.push({
          type,
          userId: order.customerId,
          title: 'Order Delivered',
          message: `Your order #${order.orderNumber} has been delivered. Enjoy your meal!`,
          orderId: order.id
        })
        break

      case 'ORDER_CANCELLED':
        notifications.push({
          type,
          userId: order.customerId,
          title: 'Order Cancelled',
          message: customMessage || `Your order #${order.orderNumber} has been cancelled`,
          orderId: order.id
        })
        break
    }

    return notifications
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()
