
import { prisma } from '@/lib/db'
import { realtimeService } from '@/lib/realtime'
import { NotificationService } from '@/lib/notification-service'

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

export interface StatusUpdateData {
  orderId: string
  status: OrderStatus
  message?: string
  latitude?: number
  longitude?: number
  updatedBy: string
  estimatedTime?: Date
  metadata?: any
}

export class TrackingService {
  private static instance: TrackingService

  static getInstance(): TrackingService {
    if (!TrackingService.instance) {
      TrackingService.instance = new TrackingService()
    }
    return TrackingService.instance
  }

  // Update order status with tracking
  async updateOrderStatus(data: StatusUpdateData) {
    try {
      // Update order status
      const order = await prisma.order.update({
        where: { id: data.orderId },
        data: {
          status: data.status,
          ...(data.status === 'DELIVERED' && { actualDelivery: new Date() }),
          ...(data.estimatedTime && { estimatedDelivery: data.estimatedTime })
        }
      })

      // Add tracking entry
      await prisma.orderTracking.create({
        data: {
          orderId: data.orderId,
          status: data.status,
          message: data.message,
          latitude: data.latitude,
          longitude: data.longitude,
          updatedBy: data.updatedBy,
          actualTime: new Date(),
          estimatedTime: data.estimatedTime,
          metadata: data.metadata
        }
      })

      // Send real-time updates
      await realtimeService.sendOrderUpdate(
        data.orderId,
        data.status,
        data.message,
        data.latitude,
        data.longitude
      )

      // Send notifications
      await NotificationService.sendNotification({
        userId: data.updatedBy,
        title: 'Order Status Update',
        body: data.message || 'Your order status has been updated',
        type: 'order_status'
      })

      // Handle status-specific actions
      await this.handleStatusSpecificActions(data.orderId, data.status, data.updatedBy)

      return order
    } catch (error) {
      console.error('Error updating order status:', error)
      throw error
    }
  }

  // Update driver location
  async updateDriverLocation(driverId: string, latitude: number, longitude: number, heading?: number, speed?: number) {
    try {
      // Update driver's current location
      await prisma.driver.update({
        where: { id: driverId },
        data: {
          currentLatitude: latitude,
          currentLongitude: longitude
        }
      })

      // Create location tracking entry
      await prisma.driverLocation.create({
        data: {
          driverId,
          latitude,
          longitude,
          heading,
          speed,
          isOnline: true,
          isDelivering: true
        }
      })

      // Send real-time location updates
      await realtimeService.sendDriverLocationUpdate(driverId, latitude, longitude, heading)

      // Check for geofencing triggers
      await this.checkGeofencingTriggers(driverId, latitude, longitude)

    } catch (error) {
      console.error('Error updating driver location:', error)
      throw error
    }
  }

  // Calculate and update preparation time
  async updatePreparationTime(vendorId: string, orderId: string, estimatedTime: number, complexity: number = 1) {
    try {
      // Create preparation time entry
      await prisma.preparationTime.create({
        data: {
          vendorId,
          orderId,
          baseTime: estimatedTime,
          complexity,
          rush: this.isRushHour(),
          estimatedTime
        }
      })

      // Update order estimated delivery time
      const estimatedDelivery = new Date(Date.now() + estimatedTime * 60000)
      
      await prisma.order.update({
        where: { id: orderId },
        data: { estimatedDelivery }
      })

      // Update time estimate
      await prisma.orderTimeEstimate.upsert({
        where: { orderId },
        update: {
          preparationTime: estimatedTime,
          estimatedPickup: estimatedDelivery
        },
        create: {
          orderId,
          preparationTime: estimatedTime,
          pickupTime: 10,
          deliveryTime: 20,
          totalTime: estimatedTime + 30,
          estimatedPickup: estimatedDelivery
        }
      })

      // Send notification about preparation time
      await NotificationService.sendNotification({
        userId: 'system',
        title: 'Preparation Time Updated',
        body: `Estimated preparation time: ${estimatedTime} minutes`,
        type: 'preparation_time'
      })

    } catch (error) {
      console.error('Error updating preparation time:', error)
      throw error
    }
  }

  // Auto-assign driver to order
  async autoAssignDriver(orderId: string, radius: number = 10) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          vendor: true
        }
      })

      if (!order || order.driverId) {
        return null
      }

      // Find available drivers
      const availableDrivers = await prisma.driver.findMany({
        where: {
          isAvailable: true,
          verificationStatus: 'VERIFIED',
          canDeliverFood: true,
          currentLatitude: { not: null },
          currentLongitude: { not: null }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Calculate distances and create assignments
      const assignments = []
      for (const driver of availableDrivers) {
        const distance = this.calculateDistance(
          driver.currentLatitude!,
          driver.currentLongitude!,
          order.vendor?.latitude || 0,
          order.vendor?.longitude || 0
        )

        if (distance <= radius) {
          const assignment = await prisma.driverAssignment.create({
            data: {
              orderId,
              driverId: driver.id,
              priority: Math.floor(10 - distance), // Closer drivers get higher priority
              distance,
              eta: Math.ceil(distance / 0.5), // 30 km/h average speed
              expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes
            }
          })

          assignments.push(assignment)

          // Send assignment notification
          await NotificationService.sendNotification({
            userId: driver.userId,
            title: 'New Order Assignment',
            body: 'You have been assigned a new order',
            type: 'order_assignment'
          })
          await realtimeService.sendDriverAssignment(driver.id, assignment.id, order)
        }
      }

      return assignments
    } catch (error) {
      console.error('Error auto-assigning driver:', error)
      throw error
    }
  }

  // Handle driver assignment response
  async handleDriverAssignmentResponse(assignmentId: string, response: 'ACCEPTED' | 'REJECTED', driverId: string) {
    try {
      const assignment = await prisma.driverAssignment.update({
        where: { id: assignmentId },
        data: {
          status: response,
          respondedAt: new Date()
        }
      })

      if (response === 'ACCEPTED') {
        // Assign driver to order
        await prisma.order.update({
          where: { id: assignment.orderId },
          data: { driverId }
        })

        // Update order status
        await this.updateOrderStatus({
          orderId: assignment.orderId,
          status: 'READY_FOR_PICKUP',
          message: 'Driver assigned and heading to pickup location',
          updatedBy: driverId
        })

        // Update driver availability
        await prisma.driver.update({
          where: { id: driverId },
          data: { isAvailable: false }
        })

        // Expire other pending assignments
        await prisma.driverAssignment.updateMany({
          where: {
            orderId: assignment.orderId,
            status: 'PENDING',
            id: { not: assignmentId }
          },
          data: { status: 'EXPIRED' }
        })
      }

      return assignment
    } catch (error) {
      console.error('Error handling driver assignment response:', error)
      throw error
    }
  }

  // Check geofencing triggers
  private async checkGeofencingTriggers(driverId: string, latitude: number, longitude: number) {
    try {
      // Get active geofences for current driver's orders
      const activeOrder = await prisma.order.findFirst({
        where: {
          driverId,
          status: { in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] }
        },
        include: {
          geofences: {
            where: { isActive: true }
          }
        }
      })

      if (!activeOrder) return

      // Check if driver is within any geofence
      for (const geofence of activeOrder.geofences) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          geofence.latitude,
          geofence.longitude
        )

        if (distance * 1000 <= geofence.radius) { // Convert km to meters
          await this.handleGeofenceEnter(activeOrder.id, geofence.type, driverId)
        }
      }
    } catch (error) {
      console.error('Error checking geofencing triggers:', error)
    }
  }

  // Handle geofence enter events
  private async handleGeofenceEnter(orderId: string, geofenceType: string, driverId: string) {
    try {
      if (geofenceType === 'pickup') {
        // Driver arrived at pickup location
        await this.updateOrderStatus({
          orderId,
          status: 'READY_FOR_PICKUP',
          message: 'Driver arrived at pickup location',
          updatedBy: driverId
        })
      } else if (geofenceType === 'delivery') {
        // Driver arrived at delivery location
        await NotificationService.sendNotification({
          userId: 'system',
          title: 'Driver Arrived',
          body: 'Your driver has arrived at the delivery location',
          type: 'driver_arrived'
        })
      }
    } catch (error) {
      console.error('Error handling geofence enter:', error)
    }
  }

  // Handle status-specific actions
  private async handleStatusSpecificActions(orderId: string, status: OrderStatus, updatedBy: string) {
    try {
      switch (status) {
        case 'CONFIRMED':
          // Start auto-assignment process
          setTimeout(() => this.autoAssignDriver(orderId), 5000) // 5 seconds delay
          break

        case 'READY_FOR_PICKUP':
          // Create geofence for pickup location
          await this.createPickupGeofence(orderId)
          break

        case 'OUT_FOR_DELIVERY':
          // Create geofence for delivery location
          await this.createDeliveryGeofence(orderId)
          break

        case 'DELIVERED':
          // Update driver availability
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { driverId: true }
          })

          if (order?.driverId) {
            await prisma.driver.update({
              where: { id: order.driverId },
              data: { isAvailable: true }
            })
          }
          break
      }
    } catch (error) {
      console.error('Error handling status-specific actions:', error)
    }
  }

  // Create pickup geofence
  private async createPickupGeofence(orderId: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          vendor: {
            select: {
              latitude: true,
              longitude: true,
              businessName: true
            }
          }
        }
      })

      if (!order?.vendor?.latitude || !order?.vendor?.longitude) return

      await prisma.geofence.create({
        data: {
          name: `Pickup: ${order.vendor.businessName}`,
          type: 'pickup',
          latitude: order.vendor.latitude,
          longitude: order.vendor.longitude,
          radius: 50, // 50 meters
          orderId
        }
      })
    } catch (error) {
      console.error('Error creating pickup geofence:', error)
    }
  }

  // Create delivery geofence
  private async createDeliveryGeofence(orderId: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          deliveryLatitude: true,
          deliveryLongitude: true,
          deliveryAddress: true
        }
      })

      if (!order?.deliveryLatitude || !order?.deliveryLongitude) return

      await prisma.geofence.create({
        data: {
          name: `Delivery: ${order.deliveryAddress}`,
          type: 'delivery',
          latitude: order.deliveryLatitude,
          longitude: order.deliveryLongitude,
          radius: 100, // 100 meters
          orderId
        }
      })
    } catch (error) {
      console.error('Error creating delivery geofence:', error)
    }
  }

  // Utility functions
  private getNotificationTypeFromStatus(status: OrderStatus): any {
    const mapping = {
      'PENDING': 'ORDER_PLACED',
      'CONFIRMED': 'ORDER_CONFIRMED',
      'PREPARING': 'ORDER_PREPARING',
      'READY_FOR_PICKUP': 'ORDER_READY',
      'OUT_FOR_DELIVERY': 'ORDER_OUT_FOR_DELIVERY',
      'DELIVERED': 'ORDER_DELIVERED',
      'CANCELLED': 'ORDER_CANCELLED'
    }
    return mapping[status] || 'ORDER_PLACED'
  }

  private isRushHour(): boolean {
    const now = new Date()
    const hour = now.getHours()
    return (hour >= 11 && hour <= 13) || (hour >= 17 && hour <= 19)
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }
}

// Export singleton instance
export const trackingService = TrackingService.getInstance()
