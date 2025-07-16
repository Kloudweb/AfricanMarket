

import { prisma } from '@/lib/db'
import { driverService } from '@/lib/driver-service'

export interface DriverAvailabilityStatus {
  driverId: string
  mode: 'ONLINE' | 'OFFLINE' | 'BREAK' | 'MAINTENANCE'
  location?: { lat: number; lng: number; address?: string }
  batteryLevel?: number
  networkQuality?: string
  reason?: string
}

export interface DriverNotificationPreferences {
  enablePushNotifications: boolean
  enableSoundAlerts: boolean
  enableVibration: boolean
  notificationRadius: number
  quietHoursEnabled: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
}

export interface DriverNavigationSession {
  navigationId: string
  driverId: string
  orderId?: string
  rideId?: string
  startLocation: { lat: number; lng: number; address?: string }
  endLocation: { lat: number; lng: number; address?: string }
  waypoints?: Array<{ lat: number; lng: number; address?: string }>
  routeData?: any
  estimatedTime?: number
  actualTime?: number
  distance?: number
  trafficCondition?: string
}

export class EnhancedDriverService {
  private static instance: EnhancedDriverService

  static getInstance(): EnhancedDriverService {
    if (!EnhancedDriverService.instance) {
      EnhancedDriverService.instance = new EnhancedDriverService()
    }
    return EnhancedDriverService.instance
  }

  // Enhanced availability management
  async updateAvailability(status: DriverAvailabilityStatus): Promise<void> {
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: status.driverId },
        include: { driverSettings: true }
      })

      if (!driver) {
        throw new Error('Driver not found')
      }

      // Check if driver can change availability
      const activeOrder = await prisma.order.findFirst({
        where: {
          driverId: status.driverId,
          status: { in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] }
        }
      })

      if (activeOrder && status.mode === 'OFFLINE') {
        throw new Error('Cannot go offline while delivering an order')
      }

      const previousMode = driver.availabilityMode

      // Update driver availability
      await prisma.driver.update({
        where: { id: status.driverId },
        data: {
          availabilityMode: status.mode,
          isAvailable: status.mode === 'ONLINE',
          lastAvailabilityChange: new Date(),
          ...(status.location && { 
            currentLatitude: status.location.lat,
            currentLongitude: status.location.lng 
          })
        }
      })

      // Create availability history record
      await prisma.driverAvailabilityHistory.create({
        data: {
          driverId: status.driverId,
          previousMode,
          newMode: status.mode,
          changeReason: status.reason || 'MANUAL',
          location: (status.location || null) as any,
          batteryLevel: status.batteryLevel,
          networkQuality: status.networkQuality,
          timestamp: new Date()
        }
      })

      // Send real-time updates
      // await this.sendRealTimeUpdate(status.driverId, 'availability_changed', status)
    } catch (error) {
      console.error('Error updating driver availability:', error)
      throw error
    }
  }

  // Enhanced notification system
  async sendDriverNotification(
    driverId: string,
    notification: {
      type: string
      title: string
      message: string
      data?: any
      priority?: 'HIGH' | 'NORMAL' | 'LOW'
      orderId?: string
      rideId?: string
      expiresAt?: Date
    }
  ): Promise<void> {
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        include: { driverSettings: true }
      })

      if (!driver) {
        throw new Error('Driver not found')
      }

      // Check notification preferences
      const settings = driver.driverSettings
      if (!settings?.enablePushNotifications && notification.priority !== 'HIGH') {
        return
      }

      // Check quiet hours
      if (settings?.quietHoursEnabled && notification.priority !== 'HIGH') {
        const now = new Date()
        const currentTime = now.toTimeString().slice(0, 5)
        const isQuietHour = settings.quietHoursStart && settings.quietHoursEnd &&
          (currentTime >= settings.quietHoursStart || currentTime <= settings.quietHoursEnd)
        
        if (isQuietHour) {
          return
        }
      }

      // Create notification record
      await prisma.driverRequestNotification.create({
        data: {
          driverId,
          orderId: notification.orderId,
          rideId: notification.rideId,
          notificationType: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || null,
          priority: notification.priority || 'NORMAL',
          soundEnabled: settings?.enableSoundAlerts ?? true,
          vibrationEnabled: settings?.enableVibration ?? true,
          expiresAt: notification.expiresAt
        }
      })

      // Send push notification
      // await this.sendPushNotification(driver, notification)
    } catch (error) {
      console.error('Error sending driver notification:', error)
      throw error
    }
  }

  // Enhanced navigation tracking
  async startNavigationSession(session: DriverNavigationSession): Promise<string> {
    try {
      const navigationHistory = await prisma.driverNavigationHistory.create({
        data: {
          driverId: session.driverId,
          orderId: session.orderId,
          rideId: session.rideId,
          navigationId: session.navigationId,
          startLocation: session.startLocation as any,
          endLocation: session.endLocation as any,
          waypoints: (session.waypoints || null) as any,
          routeData: (session.routeData || null) as any,
          distance: session.distance,
          estimatedTime: session.estimatedTime,
          trafficCondition: session.trafficCondition
        }
      })

      return navigationHistory.id
    } catch (error) {
      console.error('Error starting navigation session:', error)
      throw error
    }
  }

  async updateNavigationSession(
    navigationId: string,
    updates: {
      routeData?: any
      actualTime?: number
      completed?: boolean
      cancelled?: boolean
    }
  ): Promise<void> {
    try {
      const updateData: any = {}

      if (updates.routeData) {
        updateData.routeData = updates.routeData
      }

      if (updates.actualTime) {
        updateData.actualTime = updates.actualTime
      }

      if (updates.completed) {
        updateData.completedAt = new Date()
      }

      if (updates.cancelled) {
        updateData.cancelledAt = new Date()
      }

      await prisma.driverNavigationHistory.updateMany({
        where: { navigationId },
        data: updateData
      })
    } catch (error) {
      console.error('Error updating navigation session:', error)
      throw error
    }
  }

  // Enhanced earnings tracking
  async updateDailyEarnings(driverId: string, date: Date): Promise<void> {
    try {
      const startOfDay = new Date(date.setHours(0, 0, 0, 0))
      const endOfDay = new Date(date.setHours(23, 59, 59, 999))

      // Get earnings for the day
      const earnings = await prisma.earning.findMany({
        where: {
          driverId,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        },

      })

      // Calculate analytics
      const analytics = earnings.reduce((acc, earning) => {
        const isDelivery = !!earning.orderId
        const isRide = !!earning.rideId
        
        return {
          totalEarnings: acc.totalEarnings + earning.amount,
          baseEarnings: acc.baseEarnings + earning.amount,
          bonusEarnings: acc.bonusEarnings + 0,
          tipEarnings: acc.tipEarnings + 0,
          fuelAllowance: acc.fuelAllowance + 0,
          deductions: acc.deductions + earning.commission,
          netEarnings: acc.netEarnings + earning.netAmount,
          totalDeliveries: acc.totalDeliveries + (isDelivery ? 1 : 0),
          totalRides: acc.totalRides + (isRide ? 1 : 0),
          totalDistance: acc.totalDistance + 0,
          totalTime: acc.totalTime + 0
        }
      }, {
        totalEarnings: 0,
        baseEarnings: 0,
        bonusEarnings: 0,
        tipEarnings: 0,
        fuelAllowance: 0,
        deductions: 0,
        netEarnings: 0,
        totalDeliveries: 0,
        totalRides: 0,
        totalDistance: 0,
        totalTime: 0
      })

      // Calculate additional metrics
      const avgEarningsPerHour = analytics.totalTime > 0 ? 
        (analytics.totalEarnings / (analytics.totalTime / 60)) : 0
      const avgEarningsPerKm = analytics.totalDistance > 0 ? 
        (analytics.totalEarnings / analytics.totalDistance) : 0

      // Update or create analytics record
      await prisma.driverEarningsAnalytics.upsert({
        where: {
          driverId_date: {
            driverId,
            date: startOfDay
          }
        },
        update: {
          ...analytics,
          avgEarningsPerHour,
          avgEarningsPerKm
        },
        create: {
          driverId,
          date: startOfDay,
          ...analytics,
          avgEarningsPerHour,
          avgEarningsPerKm
        }
      })
    } catch (error) {
      console.error('Error updating daily earnings:', error)
      throw error
    }
  }

  // Enhanced photo upload with delivery confirmation
  async uploadDeliveryPhoto(
    driverId: string,
    orderId: string,
    photoData: {
      photoUrl: string
      photoType: string
      location?: { lat: number; lng: number; address?: string }
      fileSize: number
      fileName: string
      notes?: string
    }
  ): Promise<void> {
    try {
      // Verify driver is assigned to this order
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      })

      if (!order || order.driverId !== driverId) {
        throw new Error('Unauthorized - driver not assigned to this order')
      }

      // Create delivery photo record
      const deliveryPhoto = await prisma.driverDeliveryPhoto.create({
        data: {
          driverId,
          orderId,
          photoUrl: photoData.photoUrl,
          photoType: photoData.photoType,
          location: (photoData.location || null) as any,
          fileSize: photoData.fileSize,
          fileName: photoData.fileName,
          metadata: {
            notes: photoData.notes || null,
            timestamp: new Date().toISOString()
          }
        }
      })

      // If this is a delivery confirmation photo, update the order
      if (photoData.photoType === 'DELIVERY') {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'DELIVERED',
            actualDelivery: new Date()
          }
        })

        // Create or update delivery confirmation
        await prisma.deliveryConfirmation.upsert({
          where: { orderId },
          update: {
            photos: {
              push: deliveryPhoto.id
            }
          },
          create: {
            orderId,
            driverId,
            customerId: order.customerId,
            latitude: photoData.location?.lat || 0,
            longitude: photoData.location?.lng || 0,
            photos: [deliveryPhoto.id],
            notes: photoData.notes || null
          }
        })

        // Send notification to customer
        await this.sendDriverNotification(order.customerId, {
          type: 'ORDER_DELIVERED',
          title: 'Order Delivered',
          message: `Your order #${order.orderNumber} has been delivered successfully.`,
          data: {
            orderId,
            deliveryPhotoId: deliveryPhoto.id
          }
        })
      }
    } catch (error) {
      console.error('Error uploading delivery photo:', error)
      throw error
    }
  }

  // Get comprehensive driver analytics
  async getDriverAnalytics(driverId: string, period: string): Promise<any> {
    try {
      let dateRange: { start: Date; end: Date }
      const now = new Date()

      switch (period) {
        case 'today':
          dateRange = {
            start: new Date(now.setHours(0, 0, 0, 0)),
            end: new Date(now.setHours(23, 59, 59, 999))
          }
          break
        case 'week':
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          dateRange = {
            start: weekStart,
            end: new Date()
          }
          break
        case 'month':
          dateRange = {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date()
          }
          break
        default:
          dateRange = {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
          }
      }

      const [driver, earningsAnalytics, availabilityHistory] = await Promise.all([
        prisma.driver.findUnique({
          where: { id: driverId },
          include: {
            earnings: {
              where: {
                createdAt: {
                  gte: dateRange.start,
                  lte: dateRange.end
                }
              }
            }
          }
        }),
        prisma.driverEarningsAnalytics.findMany({
          where: {
            driverId,
            date: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          },
          orderBy: { date: 'desc' }
        }),
        prisma.driverAvailabilityHistory.findMany({
          where: {
            driverId,
            timestamp: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 100
        })
      ])

      return {
        driver,
        earningsAnalytics,
        availabilityHistory,
        period,
        dateRange
      }
    } catch (error) {
      console.error('Error getting driver analytics:', error)
      throw error
    }
  }
}

// Export singleton instance
export const enhancedDriverService = EnhancedDriverService.getInstance()
