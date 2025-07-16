
import { prisma } from '@/lib/db'
import { trackingService } from '@/lib/tracking-service'
import { notificationService } from '@/lib/notification-service'

export interface DriverLocationUpdate {
  driverId: string
  latitude: number
  longitude: number
  heading?: number
  speed?: number
  accuracy?: number
  batteryLevel?: number
  isOnline: boolean
  isDelivering: boolean
  currentOrderId?: string
}

export class DriverService {
  private static instance: DriverService

  static getInstance(): DriverService {
    if (!DriverService.instance) {
      DriverService.instance = new DriverService()
    }
    return DriverService.instance
  }

  // Update driver location with tracking
  async updateDriverLocation(update: DriverLocationUpdate) {
    try {
      // Update driver's current location
      await prisma.driver.update({
        where: { id: update.driverId },
        data: {
          currentLatitude: update.latitude,
          currentLongitude: update.longitude,
          isAvailable: update.isOnline && !update.isDelivering
        }
      })

      // Create location tracking entry
      await prisma.driverLocation.create({
        data: {
          driverId: update.driverId,
          latitude: update.latitude,
          longitude: update.longitude,
          heading: update.heading,
          speed: update.speed,
          accuracy: update.accuracy,
          batteryLevel: update.batteryLevel,
          isOnline: update.isOnline,
          isDelivering: update.isDelivering,
          currentOrderId: update.currentOrderId
        }
      })

      // Send real-time location updates
      await trackingService.updateDriverLocation(
        update.driverId,
        update.latitude,
        update.longitude,
        update.heading,
        update.speed
      )

      // Clean up old location records
      await this.cleanupOldLocationRecords(update.driverId)

    } catch (error) {
      console.error('Error updating driver location:', error)
      throw error
    }
  }

  // Start driver shift
  async startDriverShift(driverId: string) {
    try {
      // Check if driver already has an active shift
      const activeShift = await prisma.driverShift.findFirst({
        where: {
          driverId,
          status: 'ACTIVE'
        }
      })

      if (activeShift) {
        throw new Error('Driver already has an active shift')
      }

      // Create new shift
      const shift = await prisma.driverShift.create({
        data: {
          driverId,
          startTime: new Date(),
          status: 'ACTIVE'
        }
      })

      // Update driver availability
      await prisma.driver.update({
        where: { id: driverId },
        data: { isAvailable: true }
      })

      return shift
    } catch (error) {
      console.error('Error starting driver shift:', error)
      throw error
    }
  }

  // End driver shift
  async endDriverShift(driverId: string) {
    try {
      const activeShift = await prisma.driverShift.findFirst({
        where: {
          driverId,
          status: 'ACTIVE'
        }
      })

      if (!activeShift) {
        throw new Error('No active shift found')
      }

      // Calculate shift statistics
      const endTime = new Date()
      const startTime = activeShift.startTime
      const totalTime = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60)

      // Get earnings during this shift
      const earnings = await prisma.earning.findMany({
        where: {
          driverId,
          createdAt: {
            gte: startTime,
            lte: endTime
          }
        }
      })

      const totalEarnings = earnings.reduce((sum, earning) => sum + earning.netAmount, 0)
      const totalDeliveries = earnings.length

      // Update shift with final statistics
      const shift = await prisma.driverShift.update({
        where: { id: activeShift.id },
        data: {
          endTime,
          status: 'ENDED',
          totalTime,
          totalEarnings,
          totalDeliveries
        }
      })

      // Update driver availability
      await prisma.driver.update({
        where: { id: driverId },
        data: { isAvailable: false }
      })

      return shift
    } catch (error) {
      console.error('Error ending driver shift:', error)
      throw error
    }
  }

  // Get driver dashboard data
  async getDriverDashboard(driverId: string) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        include: {
          user: {
            select: {
              name: true,
              avatar: true
            }
          }
        }
      })

      if (!driver) {
        throw new Error('Driver not found')
      }

      // Get current shift
      const activeShift = await prisma.driverShift.findFirst({
        where: {
          driverId,
          status: 'ACTIVE'
        }
      })

      // Get pending assignments
      const pendingAssignments = await prisma.driverAssignment.findMany({
        where: {
          driverId,
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        },
        include: {
          order: {
            include: {
              vendor: {
                select: {
                  businessName: true,
                  address: true,
                  phone: true,
                  latitude: true,
                  longitude: true
                }
              },
              items: {
                include: {
                  product: {
                    select: {
                      name: true,
                      image: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { priority: 'desc' }
      })

      // Get active order
      const activeOrder = await prisma.order.findFirst({
        where: {
          driverId,
          status: { in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] }
        },
        include: {
          vendor: {
            select: {
              businessName: true,
              address: true,
              phone: true,
              latitude: true,
              longitude: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  image: true
                }
              }
            }
          },
          timeEstimate: true
        }
      })

      // Get today's statistics
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const todayEarnings = await prisma.earning.findMany({
        where: {
          driverId,
          createdAt: { gte: today }
        }
      })

      const todayStats = {
        totalEarnings: todayEarnings.reduce((sum, earning) => sum + earning.netAmount, 0),
        totalDeliveries: todayEarnings.length,
        onlineTime: activeShift ? Math.floor((Date.now() - activeShift.startTime.getTime()) / 1000 / 60) : 0
      }

      // Get recent deliveries
      const recentDeliveries = await prisma.order.findMany({
        where: {
          driverId,
          status: 'DELIVERED'
        },
        include: {
          vendor: {
            select: {
              businessName: true
            }
          },
          deliveryConfirmation: true
        },
        orderBy: { actualDelivery: 'desc' },
        take: 5
      })

      return {
        driver,
        activeShift,
        pendingAssignments,
        activeOrder,
        todayStats,
        recentDeliveries
      }
    } catch (error) {
      console.error('Error getting driver dashboard:', error)
      throw error
    }
  }

  // Handle assignment response
  async respondToAssignment(assignmentId: string, response: 'ACCEPTED' | 'REJECTED', driverId: string, message?: string) {
    try {
      const assignment = await prisma.driverAssignment.findUnique({
        where: { id: assignmentId },
        include: { order: true }
      })

      if (!assignment) {
        throw new Error('Assignment not found')
      }

      if (assignment.driverId !== driverId) {
        throw new Error('Unauthorized')
      }

      if (assignment.status !== 'PENDING') {
        throw new Error('Assignment already responded to')
      }

      // Use tracking service to handle the response
      await trackingService.handleDriverAssignmentResponse(assignmentId, response, driverId)

      return assignment
    } catch (error) {
      console.error('Error responding to assignment:', error)
      throw error
    }
  }

  // Confirm delivery
  async confirmDelivery(orderId: string, driverId: string, confirmationData: {
    latitude: number
    longitude: number
    photos?: string[]
    signature?: string
    notes?: string
  }) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { driver: true }
      })

      if (!order) {
        throw new Error('Order not found')
      }

      if (order.driver?.id !== driverId) {
        throw new Error('Unauthorized')
      }

      // Create delivery confirmation
      const deliveryConfirmation = await prisma.deliveryConfirmation.create({
        data: {
          orderId,
          driverId,
          customerId: order.customerId,
          latitude: confirmationData.latitude,
          longitude: confirmationData.longitude,
          photos: confirmationData.photos || [],
          signature: confirmationData.signature,
          notes: confirmationData.notes
        }
      })

      // Update order status to delivered
      await trackingService.updateOrderStatus({
        orderId,
        status: 'DELIVERED',
        message: 'Order delivered successfully',
        latitude: confirmationData.latitude,
        longitude: confirmationData.longitude,
        updatedBy: driverId
      })

      return deliveryConfirmation
    } catch (error) {
      console.error('Error confirming delivery:', error)
      throw error
    }
  }

  // Get nearby orders for driver
  async getNearbyOrders(driverId: string, radius: number = 10) {
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        select: {
          currentLatitude: true,
          currentLongitude: true,
          isAvailable: true
        }
      })

      if (!driver || !driver.isAvailable) {
        return []
      }

      if (!driver.currentLatitude || !driver.currentLongitude) {
        return []
      }

      // Find orders waiting for driver assignment
      const orders = await prisma.order.findMany({
        where: {
          driverId: null,
          status: { in: ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'] }
        },
        include: {
          vendor: {
            select: {
              businessName: true,
              address: true,
              latitude: true,
              longitude: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  image: true
                }
              }
            }
          }
        }
      })

      // Filter by distance
      const nearbyOrders = orders
        .filter(order => {
          if (!order.vendor?.latitude || !order.vendor?.longitude) return false
          
          const distance = this.calculateDistance(
            driver.currentLatitude!,
            driver.currentLongitude!,
            order.vendor.latitude,
            order.vendor.longitude
          )
          
          return distance <= radius
        })
        .map(order => ({
          ...order,
          distance: this.calculateDistance(
            driver.currentLatitude!,
            driver.currentLongitude!,
            order.vendor!.latitude!,
            order.vendor!.longitude!
          )
        }))
        .sort((a, b) => a.distance - b.distance)

      return nearbyOrders
    } catch (error) {
      console.error('Error getting nearby orders:', error)
      throw error
    }
  }

  // Clean up old location records
  private async cleanupOldLocationRecords(driverId: string) {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      
      await prisma.driverLocation.deleteMany({
        where: {
          driverId,
          timestamp: { lt: cutoffTime }
        }
      })
    } catch (error) {
      console.error('Error cleaning up old location records:', error)
    }
  }

  // Utility function to calculate distance
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
export const driverService = DriverService.getInstance()
