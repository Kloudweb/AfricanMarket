
import { prisma } from '@/lib/db'
import { RealTimeService } from './real-time-service'

export class NotificationService {
  // Send notification to user
  static async sendNotification(data: {
    userId: string
    title: string
    body: string
    type: string
    rideId?: string
    orderId?: string
    data?: any
    persistent?: boolean
  }) {
    try {
      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.body,
          type: data.type,
          rideId: data.rideId,
          orderId: data.orderId,
        }
      })

      // Send real-time notification if user is online
      if (RealTimeService.isUserOnline(data.userId)) {
        RealTimeService.sendCallEvent(data.userId, 'notification', {
          id: notification.id,
          title: data.title,
          body: data.body,
          type: data.type,
          data: data.data || {},
          timestamp: new Date()
        })
      } else {
        // Queue push notification for offline user
        await prisma.pushNotification.create({
          data: {
            userId: data.userId,
            title: data.title,
            body: data.body,
            data: data.data || {},
            rideId: data.rideId,
            orderId: data.orderId,
            sent: false,
          }
        })
      }

      return notification
    } catch (error) {
      console.error('Error sending notification:', error)
      throw error
    }
  }

  // Send ride status notification
  static async sendRideStatusNotification(rideId: string, status: string, customMessage?: string) {
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

      const statusMessages = {
        'ACCEPTED': 'Your ride has been accepted',
        'DRIVER_ARRIVING': 'Your driver is arriving',
        'IN_PROGRESS': 'Your ride is in progress',
        'COMPLETED': 'Your ride has been completed',
        'CANCELLED': 'Your ride has been cancelled'
      }

      const message = customMessage || statusMessages[status as keyof typeof statusMessages] || 'Ride status updated'

      // Notify customer
      await this.sendNotification({
        userId: ride.customerId,
        title: 'Ride Update',
        body: message,
        type: 'ride_status',
        rideId: rideId,
        data: {
          status,
          rideId,
          driverName: ride.driver?.user?.name,
          driverPhone: ride.driver?.user?.phone,
        }
      })

      // Notify driver if applicable
      if (ride.driverId && status !== 'ACCEPTED') {
        await this.sendNotification({
          userId: ride.driver!.userId,
          title: 'Ride Update',
          body: message,
          type: 'ride_status',
          rideId: rideId,
          data: {
            status,
            rideId,
            customerName: ride.customer.name,
            customerPhone: ride.customer.phone,
          }
        })
      }

    } catch (error) {
      console.error('Error sending ride status notification:', error)
    }
  }

  // Send safety alert notification
  static async sendSafetyAlertNotification(alertId: string) {
    try {
      const alert = await prisma.safetyAlert.findUnique({
        where: { id: alertId },
        include: {
          ride: {
            include: {
              customer: true,
              driver: {
                include: {
                  user: true
                }
              }
            }
          },
          user: true
        }
      })

      if (!alert) {
        throw new Error('Safety alert not found')
      }

      const alertMessages = {
        'PANIC_BUTTON': 'Emergency alert triggered',
        'ROUTE_DEVIATION': 'Route deviation detected',
        'SPEED_VIOLATION': 'Speed limit violation detected',
        'UNUSUAL_STOP': 'Unusual stop detected',
        'EMERGENCY_CONTACT': 'Emergency contact activated',
        'DRIVER_DISTRESS': 'Driver distress signal',
        'PASSENGER_DISTRESS': 'Passenger distress signal',
        'AUTOMATIC_DETECTION': 'Automatic safety alert triggered'
      }

      const message = alertMessages[alert.alertType] || 'Safety alert triggered'

      // Notify the other party in the ride
      const otherUserId = alert.triggeredBy === alert.ride.customerId ? 
        alert.ride.driver?.userId : alert.ride.customerId

      if (otherUserId) {
        await this.sendNotification({
          userId: otherUserId,
          title: 'Safety Alert',
          body: message,
          type: 'safety_alert',
          rideId: alert.rideId,
          data: {
            alertId,
            alertType: alert.alertType,
            severity: alert.severity,
            location: alert.location,
            triggeredBy: alert.user.name,
          }
        })
      }

      // Notify emergency contacts
      const emergencyContacts = await prisma.emergencyContact.findMany({
        where: {
          userId: alert.triggeredBy,
          isActive: true,
          notifyEmergency: true
        }
      })

      for (const contact of emergencyContacts) {
        // TODO: Send SMS/email to emergency contact
        console.log(`Emergency notification sent to ${contact.name} (${contact.phone})`)
      }

    } catch (error) {
      console.error('Error sending safety alert notification:', error)
    }
  }

  // Send ETA update notification
  static async sendETAUpdateNotification(rideId: string, etaData: any) {
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

      const etaMinutes = Math.round(etaData.timeRemaining / 60)
      const message = `Your driver will arrive in approximately ${etaMinutes} minutes`

      // Notify customer
      await this.sendNotification({
        userId: ride.customerId,
        title: 'ETA Update',
        body: message,
        type: 'eta_update',
        rideId: rideId,
        data: {
          etaMinutes,
          estimatedArrival: etaData.estimatedArrival,
          distanceRemaining: etaData.distanceRemaining,
          confidence: etaData.confidence
        }
      })

      // Send real-time ETA update
      RealTimeService.sendETAUpdate(rideId, etaData)

    } catch (error) {
      console.error('Error sending ETA update notification:', error)
    }
  }

  // Send trip share notification
  static async sendTripShareNotification(shareId: string) {
    try {
      const tripShare = await prisma.tripShare.findUnique({
        where: { id: shareId },
        include: {
          ride: {
            include: {
              customer: true,
              driver: {
                include: {
                  user: true
                }
              }
            }
          },
          user: true
        }
      })

      if (!tripShare) {
        throw new Error('Trip share not found')
      }

      const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/shared-trip/${tripShare.shareToken}`
      const message = `${tripShare.user.name} is sharing their ride with you. Track their journey: ${shareUrl}`

      // TODO: Send SMS/email to shared contact
      console.log(`Trip share notification sent to ${tripShare.contactName} (${tripShare.contactPhone || tripShare.contactEmail})`)

    } catch (error) {
      console.error('Error sending trip share notification:', error)
    }
  }

  // Send call notification
  static async sendCallNotification(callId: string, event: string) {
    try {
      const call = await prisma.rideCall.findUnique({
        where: { id: callId },
        include: {
          caller: true,
          callee: true,
          ride: true
        }
      })

      if (!call) {
        throw new Error('Call not found')
      }

      const eventMessages = {
        'INITIATED': 'Incoming call',
        'ANSWERED': 'Call answered',
        'ENDED': 'Call ended',
        'MISSED': 'Missed call',
        'DECLINED': 'Call declined',
        'FAILED': 'Call failed'
      }

      const message = eventMessages[event as keyof typeof eventMessages] || 'Call event'

      // Notify callee for incoming calls
      if (event === 'INITIATED') {
        await this.sendNotification({
          userId: call.calleeId,
          title: 'Incoming Call',
          body: `${call.caller.name} is calling you`,
          type: 'incoming_call',
          rideId: call.rideId,
          data: {
            callId,
            callType: call.callType,
            callerName: call.caller.name,
            callerAvatar: call.caller.avatar
          }
        })
      }

      // Send real-time call event
      RealTimeService.sendCallEvent(call.calleeId, event.toLowerCase(), {
        callId,
        event,
        call
      })

    } catch (error) {
      console.error('Error sending call notification:', error)
    }
  }

  // Get notification preferences
  static async getNotificationPreferences(userId: string) {
    try {
      let preferences = await prisma.notificationPreferences.findUnique({
        where: { userId }
      })

      if (!preferences) {
        preferences = await prisma.notificationPreferences.create({
          data: {
            userId,
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
            quietHours: false,
          }
        })
      }

      return preferences
    } catch (error) {
      console.error('Error getting notification preferences:', error)
      throw error
    }
  }

  // Update notification preferences
  static async updateNotificationPreferences(userId: string, updates: any) {
    try {
      const preferences = await prisma.notificationPreferences.upsert({
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

  // Mark notification as read
  static async markAsRead(notificationId: string, userId: string) {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId: userId
        },
        data: {
          isRead: true
        }
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  // Get unread notifications count
  static async getUnreadCount(userId: string) {
    try {
      const count = await prisma.notification.count({
        where: {
          userId: userId,
          isRead: false
        }
      })

      return count
    } catch (error) {
      console.error('Error getting unread count:', error)
      throw error
    }
  }

  // Get user notifications
  static async getUserNotifications(userId: string, limit: number = 20, offset: number = 0) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      })

      return notifications
    } catch (error) {
      console.error('Error getting user notifications:', error)
      throw error
    }
  }

  // Clean up old notifications
  static async cleanupOldNotifications(daysOld: number = 30) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          isRead: true
        }
      })

      console.log(`Cleaned up ${result.count} old notifications`)
      return result.count
    } catch (error) {
      console.error('Error cleaning up old notifications:', error)
      throw error
    }
  }
}
