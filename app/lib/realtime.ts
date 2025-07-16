
import { prisma } from '@/lib/db'

// Real-time event types
export type RealtimeEvent = {
  type: 'ORDER_STATUS_UPDATE' | 'DRIVER_LOCATION_UPDATE' | 'CHAT_MESSAGE' | 'NOTIFICATION' | 'DRIVER_ASSIGNMENT'
  data: any
  userId?: string
  orderId?: string
  timestamp: string
}

// Real-time notification service
export class RealtimeService {
  private static instance: RealtimeService
  private connections: Map<string, any> = new Map()

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService()
    }
    return RealtimeService.instance
  }

  // Add connection
  addConnection(userId: string, connection: any) {
    this.connections.set(userId, connection)
  }

  // Remove connection
  removeConnection(userId: string) {
    this.connections.delete(userId)
  }

  // Send event to specific user
  sendToUser(userId: string, event: RealtimeEvent) {
    const connection = this.connections.get(userId)
    if (connection) {
      try {
        connection.send(JSON.stringify(event))
      } catch (error) {
        console.error('Error sending real-time event:', error)
        this.removeConnection(userId)
      }
    }
  }

  // Send order update to all relevant parties
  async sendOrderUpdate(orderId: string, status: string, message?: string, latitude?: number, longitude?: number) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          vendor: { select: { userId: true } },
          driver: { select: { userId: true } }
        }
      })

      if (!order) return

      const event: RealtimeEvent = {
        type: 'ORDER_STATUS_UPDATE',
        data: {
          orderId,
          status,
          message,
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        },
        orderId,
        timestamp: new Date().toISOString()
      }

      // Send to customer
      this.sendToUser(order.customerId, event)

      // Send to vendor
      if (order.vendor?.userId) {
        this.sendToUser(order.vendor.userId, event)
      }

      // Send to driver
      if (order.driver?.userId) {
        this.sendToUser(order.driver.userId, event)
      }
    } catch (error) {
      console.error('Error sending order update:', error)
    }
  }

  // Send driver location update
  async sendDriverLocationUpdate(driverId: string, latitude: number, longitude: number, heading?: number) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        include: {
          deliveryOrders: {
            where: {
              status: {
                in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY']
              }
            },
            select: {
              id: true,
              customerId: true,
              vendor: { select: { userId: true } }
            }
          }
        }
      })

      if (!driver) return

      const event: RealtimeEvent = {
        type: 'DRIVER_LOCATION_UPDATE',
        data: {
          driverId,
          latitude,
          longitude,
          heading,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }

      // Send to customers of active orders
      driver.deliveryOrders.forEach(order => {
        this.sendToUser(order.customerId, { ...event, orderId: order.id })
        
        // Send to vendor
        if (order.vendor?.userId) {
          this.sendToUser(order.vendor.userId, { ...event, orderId: order.id })
        }
      })
    } catch (error) {
      console.error('Error sending driver location update:', error)
    }
  }

  // Send chat message
  async sendChatMessage(orderId: string, senderId: string, message: string, senderRole: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          vendor: { select: { userId: true } },
          driver: { select: { userId: true } }
        }
      })

      if (!order) return

      const event: RealtimeEvent = {
        type: 'CHAT_MESSAGE',
        data: {
          orderId,
          senderId,
          message,
          senderRole,
          timestamp: new Date().toISOString()
        },
        orderId,
        timestamp: new Date().toISOString()
      }

      // Send to all parties except sender
      const recipients = [
        order.customerId,
        order.vendor?.userId,
        order.driver?.userId
      ].filter(userId => userId && userId !== senderId)

      recipients.forEach(userId => {
        if (userId) {
          this.sendToUser(userId, event)
        }
      })
    } catch (error) {
      console.error('Error sending chat message:', error)
    }
  }

  // Send driver assignment notification
  async sendDriverAssignment(driverId: string, assignmentId: string, orderData: any) {
    try {
      const event: RealtimeEvent = {
        type: 'DRIVER_ASSIGNMENT',
        data: {
          assignmentId,
          orderData,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }

      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { userId: true }
      })

      if (driver?.userId) {
        this.sendToUser(driver.userId, event)
      }
    } catch (error) {
      console.error('Error sending driver assignment:', error)
    }
  }

  // Send notification
  sendNotification(userId: string, title: string, body: string, data?: any) {
    const event: RealtimeEvent = {
      type: 'NOTIFICATION',
      data: {
        title,
        body,
        data,
        timestamp: new Date().toISOString()
      },
      userId,
      timestamp: new Date().toISOString()
    }

    this.sendToUser(userId, event)
  }
}

// Export singleton instance
export const realtimeService = RealtimeService.getInstance()
