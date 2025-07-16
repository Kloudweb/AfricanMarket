
import { WebSocketService } from './websocket-service'
import { prisma } from '@/lib/db'

export class RealTimeService {
  private static websocketService: WebSocketService

  static setWebSocketService(service: WebSocketService) {
    this.websocketService = service
  }

  // Send real-time chat message
  static async sendChatMessage(rideId: string, message: any) {
    try {
      if (this.websocketService) {
        this.websocketService.emitToRide(rideId, 'new_message', message)
      }
    } catch (error) {
      console.error('Error sending real-time chat message:', error)
    }
  }

  // Send real-time location update
  static async sendLocationUpdate(rideId: string, locationData: any) {
    try {
      if (this.websocketService) {
        this.websocketService.emitToRide(rideId, 'location_update', locationData)
      }
    } catch (error) {
      console.error('Error sending real-time location update:', error)
    }
  }

  // Send real-time ETA update
  static async sendETAUpdate(rideId: string, etaData: any) {
    try {
      if (this.websocketService) {
        this.websocketService.emitToRide(rideId, 'eta_update', etaData)
      }
    } catch (error) {
      console.error('Error sending real-time ETA update:', error)
    }
  }

  // Send safety alert
  static async sendSafetyAlert(rideId: string, alertData: any) {
    try {
      if (this.websocketService) {
        this.websocketService.emitToRide(rideId, 'safety_alert', alertData)
      }
    } catch (error) {
      console.error('Error sending safety alert:', error)
    }
  }

  // Send trip status update
  static async sendTripStatusUpdate(rideId: string, statusData: any) {
    try {
      if (this.websocketService) {
        this.websocketService.emitToRide(rideId, 'trip_status_update', statusData)
      }
    } catch (error) {
      console.error('Error sending trip status update:', error)
    }
  }

  // Send call event
  static async sendCallEvent(userId: string, event: string, callData: any) {
    try {
      if (this.websocketService) {
        this.websocketService.emitToUser(userId, event, callData)
      }
    } catch (error) {
      console.error('Error sending call event:', error)
    }
  }

  // Send typing indicator
  static async sendTypingIndicator(rideId: string, userId: string, isTyping: boolean) {
    try {
      if (this.websocketService) {
        this.websocketService.emitToRide(rideId, 'user_typing', {
          userId,
          isTyping
        })
      }
    } catch (error) {
      console.error('Error sending typing indicator:', error)
    }
  }

  // Send ride share update
  static async sendRideShareUpdate(shareToken: string, updateData: any) {
    try {
      if (this.websocketService) {
        this.websocketService.emitToRide(`share_${shareToken}`, 'ride_share_update', updateData)
      }
    } catch (error) {
      console.error('Error sending ride share update:', error)
    }
  }

  // Check if user is online
  static isUserOnline(userId: string): boolean {
    return this.websocketService ? this.websocketService.isUserOnline(userId) : false
  }

  // Get online users in ride
  static getOnlineUsersInRide(rideId: string): string[] {
    return this.websocketService ? this.websocketService.getOnlineUsersInRide(rideId) : []
  }

  // Process message queue for offline users
  static async processMessageQueue() {
    try {
      const offlineMessages = await prisma.pushNotification.findMany({
        where: { sent: false },
        take: 100,
        orderBy: { createdAt: 'asc' }
      })

      for (const notification of offlineMessages) {
        if (this.isUserOnline(notification.userId)) {
          // User is now online, send via WebSocket
          if (this.websocketService) {
            this.websocketService.emitToUser(notification.userId, 'notification', {
              title: notification.title,
              body: notification.body,
              data: notification.data
            })
          }
          
          // Mark as sent
          await prisma.pushNotification.update({
            where: { id: notification.id },
            data: { 
              sent: true,
              sentAt: new Date()
            }
          })
        } else {
          // User still offline, send push notification
          await this.sendPushNotification(notification)
        }
      }
    } catch (error) {
      console.error('Error processing message queue:', error)
    }
  }

  // Send push notification
  private static async sendPushNotification(notification: any) {
    try {
      // TODO: Implement actual push notification service (FCM, Apple Push, etc.)
      console.log(`Sending push notification to ${notification.userId}:`, notification.title)
      
      // Mark as sent
      await prisma.pushNotification.update({
        where: { id: notification.id },
        data: { 
          sent: true,
          sentAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error sending push notification:', error)
    }
  }

  // Get real-time statistics
  static getStatistics() {
    return this.websocketService ? this.websocketService.getConnectionStats() : {
      totalConnections: 0,
      uniqueUsers: 0,
      activeRides: 0,
      connectedUsers: [],
      activeRideRooms: []
    }
  }
}

// Start message queue processor
if (typeof window === 'undefined') {
  setInterval(() => {
    RealTimeService.processMessageQueue()
  }, 30000) // Process every 30 seconds
}
