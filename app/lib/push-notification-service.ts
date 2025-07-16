
// Firebase Cloud Messaging (FCM) push notification service
import { prisma } from '@/lib/db'
import { NotificationPayload, FCMNotificationPayload, DeliveryStatus } from '@/lib/types'

export class PushNotificationService {
  
  // Static methods for API routes
  static async registerDevice(
    userId: string,
    endpoint: string,
    keys: { p256dh: string; auth: string },
    deviceInfo?: any
  ) {
    try {
      const subscription = await prisma.pushSubscription.upsert({
        where: {
          userId_endpoint: {
            userId,
            endpoint
          }
        },
        update: {
          keys,
          deviceInfo,
          isActive: true
        },
        create: {
          userId,
          endpoint,
          keys,
          deviceInfo,
          isActive: true
        }
      })
      
      return subscription
    } catch (error) {
      console.error('Error registering device:', error)
      throw error
    }
  }

  static async unregisterDevice(userId: string, endpoint: string) {
    try {
      const result = await prisma.pushSubscription.updateMany({
        where: {
          userId,
          endpoint
        },
        data: {
          isActive: false
        }
      })
      
      return result
    } catch (error) {
      console.error('Error unregistering device:', error)
      throw error
    }
  }
  private fcmServerKey: string
  private fcmApiUrl: string = 'https://fcm.googleapis.com/fcm/send'

  constructor() {
    this.fcmServerKey = process.env.FCM_SERVER_KEY || ''
    if (!this.fcmServerKey) {
      console.warn('FCM_SERVER_KEY not found in environment variables')
    }
  }

  // Send push notification
  async sendNotification(payload: NotificationPayload): Promise<DeliveryStatus> {
    try {
      if (!this.fcmServerKey) {
        throw new Error('FCM not configured')
      }

      // Get user's device tokens
      const deviceTokens = await this.getUserDeviceTokens(payload.userId!)
      
      if (deviceTokens.length === 0) {
        return {
          channel: 'push',
          status: 'FAILED',
          failureReason: 'No device tokens found',
          retryCount: 0
        }
      }

      // Send to all device tokens
      const results = await Promise.allSettled(
        deviceTokens.map(token => this.sendToToken(token, payload))
      )

      // Process results
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      // Save to database
      await this.savePushNotificationToDatabase(payload, deviceTokens, successful > 0)

      return {
        channel: 'push',
        status: successful > 0 ? 'DELIVERED' : 'FAILED',
        sentAt: new Date(),
        deliveredAt: successful > 0 ? new Date() : undefined,
        failedAt: failed > 0 ? new Date() : undefined,
        failureReason: failed > 0 ? 'Some devices failed' : undefined,
        retryCount: 0
      }

    } catch (error) {
      console.error('Error sending push notification:', error)
      
      return {
        channel: 'push',
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0
      }
    }
  }

  // Send to specific device token
  private async sendToToken(deviceToken: string, payload: NotificationPayload): Promise<void> {
    try {
      const fcmPayload: FCMNotificationPayload = {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
          image: payload.data?.image
        },
        data: {
          type: payload.type,
          orderId: payload.orderId || '',
          rideId: payload.rideId || '',
          vendorId: payload.vendorId || '',
          driverId: payload.driverId || '',
          urgent: payload.urgent ? 'true' : 'false',
          ...payload.data
        },
        android: {
          priority: payload.urgent ? 'high' : 'normal',
          notification: {
            icon: 'ic_notification',
            color: '#FF6B35',
            sound: payload.urgent ? 'urgent' : 'default',
            click_action: payload.data?.clickAction || 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body
              },
              badge: 1,
              sound: payload.urgent ? 'urgent.wav' : 'default',
              category: payload.type,
              'content-available': 1
            }
          }
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/icons/notification-icon.png',
            badge: '/icons/badge-icon.png',
            image: payload.data?.image,
            vibrate: payload.urgent ? [200, 100, 200] : [100],
            timestamp: Date.now(),
            actions: payload.data?.actions || []
          }
        }
      }

      const response = await fetch(this.fcmApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.fcmServerKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: deviceToken,
          ...fcmPayload
        })
      })

      if (!response.ok) {
        throw new Error(`FCM request failed: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.failure > 0) {
        throw new Error(`FCM delivery failed: ${result.results[0].error}`)
      }

      // Update device token usage
      await this.updateDeviceTokenUsage(deviceToken)

    } catch (error) {
      console.error('Error sending to FCM token:', error)
      throw error
    }
  }

  // Get user's device tokens
  private async getUserDeviceTokens(userId: string): Promise<string[]> {
    try {
      const tokens = await prisma.deviceToken.findMany({
        where: {
          userId,
          isActive: true,
          enabled: true,
          expiresAt: {
            gt: new Date()
          }
        },
        select: {
          token: true
        }
      })

      return tokens.map(t => t.token)
    } catch (error) {
      console.error('Error getting device tokens:', error)
      return []
    }
  }

  // Register device token
  async registerDeviceToken(data: {
    userId: string
    token: string
    platform: string
    deviceId?: string
    deviceName?: string
    appVersion?: string
    osVersion?: string
  }): Promise<void> {
    try {
      await prisma.deviceToken.upsert({
        where: { token: data.token },
        create: {
          userId: data.userId,
          token: data.token,
          platform: data.platform,
          deviceId: data.deviceId,
          deviceName: data.deviceName,
          appVersion: data.appVersion,
          osVersion: data.osVersion,
          isActive: true,
          enabled: true,
          lastUsed: new Date()
        },
        update: {
          userId: data.userId,
          isActive: true,
          enabled: true,
          lastUsed: new Date(),
          appVersion: data.appVersion,
          osVersion: data.osVersion
        }
      })
    } catch (error) {
      console.error('Error registering device token:', error)
      throw error
    }
  }

  // Unregister device token
  async unregisterDeviceToken(token: string): Promise<void> {
    try {
      await prisma.deviceToken.updateMany({
        where: { token },
        data: {
          isActive: false,
          enabled: false
        }
      })
    } catch (error) {
      console.error('Error unregistering device token:', error)
      throw error
    }
  }

  // Update device token usage
  private async updateDeviceTokenUsage(token: string): Promise<void> {
    try {
      await prisma.deviceToken.updateMany({
        where: { token },
        data: {
          lastUsed: new Date()
        }
      })
    } catch (error) {
      console.error('Error updating device token usage:', error)
    }
  }

  // Save push notification to database
  private async savePushNotificationToDatabase(
    payload: NotificationPayload,
    deviceTokens: string[],
    successful: boolean
  ): Promise<void> {
    try {
      await prisma.pushNotificationQueue.create({
        data: {
          userId: payload.userId!,
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          deviceTokens,
          platforms: ['ios', 'android', 'web'],
          status: successful ? 'DELIVERED' : 'FAILED',
          sentAt: new Date(),
          deliveredAt: successful ? new Date() : undefined,
          failedAt: successful ? undefined : new Date(),
          orderId: payload.orderId,
          rideId: payload.rideId,
          vendorId: payload.vendorId,
          driverId: payload.driverId,
          retryCount: 0,
          maxRetries: 3
        }
      })
    } catch (error) {
      console.error('Error saving push notification to database:', error)
    }
  }

  // Process notification queue
  async processNotificationQueue(): Promise<void> {
    try {
      const pendingNotifications = await prisma.pushNotificationQueue.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { scheduleFor: { lte: new Date() } },
            { scheduleFor: null }
          ]
        },
        take: 100,
        orderBy: { createdAt: 'asc' }
      })

      for (const notification of pendingNotifications) {
        await this.processQueuedNotification(notification)
      }
    } catch (error) {
      console.error('Error processing notification queue:', error)
    }
  }

  // Process individual queued notification
  private async processQueuedNotification(notification: any): Promise<void> {
    try {
      const payload: NotificationPayload = {
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
        type: notification.type || 'general',
        data: notification.data,
        urgent: notification.urgent || false,
        orderId: notification.orderId,
        rideId: notification.rideId,
        vendorId: notification.vendorId,
        driverId: notification.driverId
      }

      const result = await this.sendNotification(payload)

      // Update notification status
      await prisma.pushNotificationQueue.update({
        where: { id: notification.id },
        data: {
          status: result.status,
          sentAt: result.sentAt,
          deliveredAt: result.deliveredAt,
          failedAt: result.failedAt,
          failureReason: result.failureReason
        }
      })
    } catch (error) {
      console.error('Error processing queued notification:', error)
      
      // Update retry count
      await prisma.pushNotificationQueue.update({
        where: { id: notification.id },
        data: {
          retryCount: notification.retryCount + 1,
          failedAt: new Date(),
          failureReason: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  // Cleanup expired tokens
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await prisma.deviceToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { lastUsed: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // 30 days
          ]
        }
      })

      console.log(`Cleaned up ${result.count} expired device tokens`)
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error)
    }
  }
}

