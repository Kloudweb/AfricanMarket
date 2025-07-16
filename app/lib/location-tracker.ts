
// Location tracking service for drivers
import { prisma } from '@/lib/db'
import { webSocketService } from './comprehensive-websocket-service'

export class LocationTracker {
  
  // Static methods for API routes
  static async updateLocation(
    driverId: string,
    latitude: number,
    longitude: number,
    metadata: {
      accuracy?: number
      heading?: number
      speed?: number
      orderId?: string
    } = {}
  ) {
    try {
      const location = await prisma.driverLocationUpdate.create({
        data: {
          driverId,
          latitude,
          longitude,
          accuracy: metadata.accuracy,
          heading: metadata.heading,
          speed: metadata.speed,
          orderId: metadata.orderId,
          timestamp: new Date()
        }
      })
      
      return location
    } catch (error) {
      console.error('Error updating location:', error)
      throw error
    }
  }

  static async getDriverLocation(driverId: string) {
    try {
      const location = await prisma.driverLocationUpdate.findFirst({
        where: {
          driverId
        },
        orderBy: {
          timestamp: 'desc'
        }
      })
      
      return location
    } catch (error) {
      console.error('Error getting driver location:', error)
      throw error
    }
  }

  static async getOrderLocation(orderId: string) {
    try {
      const location = await prisma.driverLocationUpdate.findFirst({
        where: {
          orderId
        },
        orderBy: {
          timestamp: 'desc'
        },
        include: {
          driver: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  avatar: true
                }
              }
            }
          }
        }
      })
      
      return location
    } catch (error) {
      console.error('Error getting order location:', error)
      throw error
    }
  }

  static async getDriverAnalytics(driverId: string, timeRange: string = '24h') {
    try {
      const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 24
      const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
      
      const locations = await prisma.driverLocationUpdate.findMany({
        where: {
          driverId,
          timestamp: {
            gte: startDate
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      })
      
      return {
        totalLocations: locations.length,
        timeRange,
        locations
      }
    } catch (error) {
      console.error('Error getting driver analytics:', error)
      throw error
    }
  }

  static async getSystemAnalytics(timeRange: string = '24h') {
    try {
      const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 24
      const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
      
      const locationCount = await prisma.driverLocationUpdate.count({
        where: {
          timestamp: {
            gte: startDate
          }
        }
      })
      
      const activeDrivers = await prisma.driverLocationUpdate.groupBy({
        by: ['driverId'],
        where: {
          timestamp: {
            gte: startDate
          }
        },
        _count: true
      })
      
      return {
        totalLocationUpdates: locationCount,
        activeDrivers: activeDrivers.length,
        timeRange
      }
    } catch (error) {
      console.error('Error getting system analytics:', error)
      throw error
    }
  }
  // Handle location update
  async handleLocationUpdate(socket: any, data: any): Promise<void> {
    try {
      const {
        latitude,
        longitude,
        accuracy,
        heading,
        speed,
        altitude,
        isOnline = true,
        isDelivering = false,
        isRiding = false,
        currentOrderId,
        currentRideId,
        batteryLevel,
        deviceId
      } = data

      if (!latitude || !longitude) {
        socket.emit('location_error', { message: 'Invalid location data' })
        return
      }

      // Create location update record
      const locationUpdate = await prisma.driverLocationUpdate.create({
        data: {
          driverId: socket.userId,
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
          altitude,
          isOnline,
          isDelivering,
          isRiding,
          currentOrderId,
          currentRideId,
          batteryLevel,
          deviceId,
          broadcast: true,
          broadcastAt: new Date()
        }
      })

      // Update driver's current location
      await prisma.driver.update({
        where: { userId: socket.userId },
        data: {
          currentLatitude: latitude,
          currentLongitude: longitude,
          isAvailable: isOnline && !isDelivering && !isRiding
        }
      })

      // Broadcast location update
      await this.broadcastLocationUpdate(locationUpdate)

      // Check geofences
      await this.checkGeofences(socket.userId, latitude, longitude)

      // Calculate ETA updates
      await this.calculateETAUpdates(socket.userId, currentOrderId, currentRideId)

    } catch (error) {
      console.error('Error handling location update:', error)
      socket.emit('location_error', { message: 'Failed to update location' })
    }
  }

  // Broadcast location update to relevant users
  private async broadcastLocationUpdate(locationUpdate: any): Promise<void> {
    try {
      const broadcastData = {
        driverId: locationUpdate.driverId,
        latitude: locationUpdate.latitude,
        longitude: locationUpdate.longitude,
        heading: locationUpdate.heading,
        speed: locationUpdate.speed,
        accuracy: locationUpdate.accuracy,
        isOnline: locationUpdate.isOnline,
        isDelivering: locationUpdate.isDelivering,
        isRiding: locationUpdate.isRiding,
        batteryLevel: locationUpdate.batteryLevel,
        timestamp: locationUpdate.timestamp
      }

      // Broadcast to current order
      if (locationUpdate.currentOrderId) {
        const order = await prisma.order.findUnique({
          where: { id: locationUpdate.currentOrderId },
          select: { customerId: true, vendorId: true }
        })

        if (order) {
          webSocketService.emitToUser(order.customerId, 'driver_location_update', broadcastData)
          webSocketService.emitToUser(order.vendorId, 'driver_location_update', broadcastData)
          webSocketService.emitToRoom(`order:${locationUpdate.currentOrderId}`, 'driver_location_update', broadcastData)
        }
      }

      // Broadcast to current ride
      if (locationUpdate.currentRideId) {
        const ride = await prisma.ride.findUnique({
          where: { id: locationUpdate.currentRideId },
          select: { customerId: true }
        })

        if (ride) {
          webSocketService.emitToUser(ride.customerId, 'driver_location_update', broadcastData)
          webSocketService.emitToRoom(`ride:${locationUpdate.currentRideId}`, 'driver_location_update', broadcastData)
        }
      }

      // Broadcast to admin/dispatcher
      webSocketService.emitToRoom('driver_management', 'driver_location_update', broadcastData)

    } catch (error) {
      console.error('Error broadcasting location update:', error)
    }
  }

  // Check geofences
  private async checkGeofences(driverId: string, latitude: number, longitude: number): Promise<void> {
    try {
      const geofences = await prisma.geofence.findMany({
        where: { isActive: true }
      })

      for (const geofence of geofences) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          geofence.latitude,
          geofence.longitude
        )

        if (distance <= geofence.radius) {
          await this.handleGeofenceEntry(driverId, geofence)
        }
      }
    } catch (error) {
      console.error('Error checking geofences:', error)
    }
  }

  // Handle geofence entry
  private async handleGeofenceEntry(driverId: string, geofence: any): Promise<void> {
    try {
      const driver = await prisma.driver.findUnique({
        where: { userId: driverId },
        include: { user: true }
      })

      if (!driver) return

      // Create geofence event
      await prisma.driverGeofenceStatus.create({
        data: {
          driverId: driver.id,
          geofenceId: geofence.id,
          eventType: 'ENTERED',
          timestamp: new Date()
        }
      })

      // Handle different geofence types
      switch (geofence.type) {
        case 'pickup':
          await this.handlePickupGeofence(driver, geofence)
          break
        case 'delivery':
          await this.handleDeliveryGeofence(driver, geofence)
          break
        case 'vendor_area':
          await this.handleVendorAreaGeofence(driver, geofence)
          break
      }
    } catch (error) {
      console.error('Error handling geofence entry:', error)
    }
  }

  // Handle pickup geofence
  private async handlePickupGeofence(driver: any, geofence: any): Promise<void> {
    try {
      if (geofence.orderId) {
        // Update order status
        await prisma.order.update({
          where: { id: geofence.orderId },
          data: { status: 'READY_FOR_PICKUP' }
        })

        // Notify customer and vendor
        const { NotificationOrchestrator } = await import('./notification-orchestrator')
        const orchestrator = new NotificationOrchestrator()
        await orchestrator.sendOrderNotification(geofence.orderId, 'driver_arrived_pickup')
      }
    } catch (error) {
      console.error('Error handling pickup geofence:', error)
    }
  }

  // Handle delivery geofence
  private async handleDeliveryGeofence(driver: any, geofence: any): Promise<void> {
    try {
      if (geofence.orderId) {
        // Create delivery confirmation request
        const { InAppNotificationService } = await import('./in-app-notification-service')
        const notificationService = new InAppNotificationService()

        await notificationService.sendNotification({
          userId: driver.userId,
          title: 'Delivery Confirmation',
          body: 'You have arrived at the delivery location. Please confirm delivery.',
          type: 'delivery_confirmation',
          orderId: geofence.orderId,
          urgent: true
        })
      }
    } catch (error) {
      console.error('Error handling delivery geofence:', error)
    }
  }

  // Handle vendor area geofence
  private async handleVendorAreaGeofence(driver: any, geofence: any): Promise<void> {
    try {
      if (geofence.vendorId) {
        // Notify vendor of driver arrival
        webSocketService.emitToUser(geofence.vendorId, 'driver_in_area', {
          driverId: driver.id,
          driverName: driver.user.name,
          arrivedAt: new Date()
        })
      }
    } catch (error) {
      console.error('Error handling vendor area geofence:', error)
    }
  }

  // Calculate ETA updates
  private async calculateETAUpdates(driverId: string, currentOrderId?: string, currentRideId?: string): Promise<void> {
    try {
      if (currentOrderId) {
        await this.calculateOrderETA(driverId, currentOrderId)
      }

      if (currentRideId) {
        await this.calculateRideETA(driverId, currentRideId)
      }
    } catch (error) {
      console.error('Error calculating ETA updates:', error)
    }
  }

  // Calculate order ETA
  private async calculateOrderETA(driverId: string, orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          customerId: true,
          vendorId: true,
          deliveryLatitude: true,
          deliveryLongitude: true
        }
      })

      if (!order || !order.deliveryLatitude || !order.deliveryLongitude) return

      const driver = await prisma.driver.findUnique({
        where: { userId: driverId },
        select: { currentLatitude: true, currentLongitude: true }
      })

      if (!driver || !driver.currentLatitude || !driver.currentLongitude) return

      // Calculate distance and ETA
      const distance = this.calculateDistance(
        driver.currentLatitude,
        driver.currentLongitude,
        order.deliveryLatitude,
        order.deliveryLongitude
      )

      const averageSpeed = 40 // km/h
      const etaMinutes = Math.ceil((distance / averageSpeed) * 60)
      const estimatedArrival = new Date(Date.now() + etaMinutes * 60 * 1000)

      // Update order time estimate
      await prisma.orderTimeEstimate.upsert({
        where: { orderId },
        create: {
          orderId,
          preparationTime: 0,
          pickupTime: 0,
          deliveryTime: etaMinutes,
          totalTime: etaMinutes,
          estimatedDelivery: estimatedArrival
        },
        update: {
          deliveryTime: etaMinutes,
          estimatedDelivery: estimatedArrival
        }
      })

      // Broadcast ETA update
      webSocketService.emitToUser(order.customerId, 'eta_update', {
        orderId,
        etaMinutes,
        estimatedArrival,
        distance
      })

      webSocketService.emitToUser(order.vendorId, 'eta_update', {
        orderId,
        etaMinutes,
        estimatedArrival,
        distance
      })
    } catch (error) {
      console.error('Error calculating order ETA:', error)
    }
  }

  // Calculate ride ETA
  private async calculateRideETA(driverId: string, rideId: string): Promise<void> {
    try {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        select: {
          customerId: true,
          status: true,
          pickupLatitude: true,
          pickupLongitude: true,
          destinationLatitude: true,
          destinationLongitude: true
        }
      })

      if (!ride) return

      const driver = await prisma.driver.findUnique({
        where: { userId: driverId },
        select: { currentLatitude: true, currentLongitude: true }
      })

      if (!driver || !driver.currentLatitude || !driver.currentLongitude) return

      let targetLatitude: number
      let targetLongitude: number

      // Determine target location based on ride status
      if (ride.status === 'ACCEPTED' || ride.status === 'DRIVER_ARRIVING') {
        targetLatitude = ride.pickupLatitude
        targetLongitude = ride.pickupLongitude
      } else {
        targetLatitude = ride.destinationLatitude
        targetLongitude = ride.destinationLongitude
      }

      // Calculate distance and ETA
      const distance = this.calculateDistance(
        driver.currentLatitude,
        driver.currentLongitude,
        targetLatitude,
        targetLongitude
      )

      const averageSpeed = 40 // km/h
      const etaMinutes = Math.ceil((distance / averageSpeed) * 60)
      const estimatedArrival = new Date(Date.now() + etaMinutes * 60 * 1000)

      // Broadcast ETA update
      webSocketService.emitToUser(ride.customerId, 'ride_eta_update', {
        rideId,
        etaMinutes,
        estimatedArrival,
        distance,
        status: ride.status
      })
    } catch (error) {
      console.error('Error calculating ride ETA:', error)
    }
  }

  // Calculate distance between two points (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Convert degrees to radians
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // Get driver location history
  async getDriverLocationHistory(driverId: string, options: {
    startDate?: Date
    endDate?: Date
    limit?: number
  } = {}): Promise<any[]> {
    try {
      const { startDate, endDate, limit = 100 } = options

      const where: any = { driverId }
      if (startDate || endDate) {
        where.timestamp = {}
        if (startDate) where.timestamp.gte = startDate
        if (endDate) where.timestamp.lte = endDate
      }

      return await prisma.driverLocationUpdate.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: {
          latitude: true,
          longitude: true,
          heading: true,
          speed: true,
          accuracy: true,
          isOnline: true,
          isDelivering: true,
          isRiding: true,
          batteryLevel: true,
          timestamp: true
        }
      })
    } catch (error) {
      console.error('Error getting driver location history:', error)
      return []
    }
  }

  // Get nearby drivers
  async getNearbyDrivers(latitude: number, longitude: number, radiusKm: number = 10): Promise<any[]> {
    try {
      const drivers = await prisma.driver.findMany({
        where: {
          isAvailable: true,
          currentLatitude: { not: null },
          currentLongitude: { not: null }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      })

      const nearbyDrivers = drivers.filter(driver => {
        if (!driver.currentLatitude || !driver.currentLongitude) return false
        
        const distance = this.calculateDistance(
          latitude,
          longitude,
          driver.currentLatitude,
          driver.currentLongitude
        )
        
        return distance <= radiusKm
      })

      return nearbyDrivers.map(driver => ({
        id: driver.id,
        userId: driver.userId,
        name: driver.user.name,
        avatar: driver.user.avatar,
        latitude: driver.currentLatitude,
        longitude: driver.currentLongitude,
        rating: driver.rating,
        distance: this.calculateDistance(
          latitude,
          longitude,
          driver.currentLatitude!,
          driver.currentLongitude!
        )
      })).sort((a, b) => a.distance - b.distance)
    } catch (error) {
      console.error('Error getting nearby drivers:', error)
      return []
    }
  }

  // Create geofence
  async createGeofence(data: {
    name: string
    type: string
    latitude: number
    longitude: number
    radius: number
    vendorId?: string
    orderId?: string
  }): Promise<any> {
    try {
      return await prisma.geofence.create({
        data: {
          name: data.name,
          type: data.type,
          latitude: data.latitude,
          longitude: data.longitude,
          radius: data.radius,
          vendorId: data.vendorId,
          orderId: data.orderId,
          isActive: true
        }
      })
    } catch (error) {
      console.error('Error creating geofence:', error)
      throw error
    }
  }

  // Update geofence
  async updateGeofence(geofenceId: string, updates: any): Promise<void> {
    try {
      await prisma.geofence.update({
        where: { id: geofenceId },
        data: updates
      })
    } catch (error) {
      console.error('Error updating geofence:', error)
      throw error
    }
  }

  // Delete geofence
  async deleteGeofence(geofenceId: string): Promise<void> {
    try {
      await prisma.geofence.update({
        where: { id: geofenceId },
        data: { isActive: false }
      })
    } catch (error) {
      console.error('Error deleting geofence:', error)
      throw error
    }
  }

  // Get driver location analytics
  async getLocationAnalytics(driverId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const locations = await prisma.driverLocationUpdate.findMany({
        where: {
          driverId,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { timestamp: 'asc' }
      })

      if (locations.length === 0) {
        return {
          totalDistance: 0,
          totalTime: 0,
          averageSpeed: 0,
          maxSpeed: 0,
          onlineTime: 0,
          deliveryTime: 0,
          locations: []
        }
      }

      let totalDistance = 0
      let maxSpeed = 0
      let onlineTime = 0
      let deliveryTime = 0

      for (let i = 1; i < locations.length; i++) {
        const prev = locations[i - 1]
        const curr = locations[i]

        // Calculate distance
        const distance = this.calculateDistance(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude
        )
        totalDistance += distance

        // Track max speed
        if (curr.speed && curr.speed > maxSpeed) {
          maxSpeed = curr.speed
        }

        // Track online time
        const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime()
        if (curr.isOnline) {
          onlineTime += timeDiff
        }

        // Track delivery time
        if (curr.isDelivering) {
          deliveryTime += timeDiff
        }
      }

      const totalTime = locations[locations.length - 1].timestamp.getTime() - locations[0].timestamp.getTime()
      const averageSpeed = totalTime > 0 ? (totalDistance / (totalTime / 3600000)) : 0 // km/h

      return {
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalTime: Math.round(totalTime / 60000), // minutes
        averageSpeed: Math.round(averageSpeed * 100) / 100,
        maxSpeed: Math.round(maxSpeed * 100) / 100,
        onlineTime: Math.round(onlineTime / 60000), // minutes
        deliveryTime: Math.round(deliveryTime / 60000), // minutes
        locations: locations.map(loc => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: loc.timestamp,
          speed: loc.speed,
          isOnline: loc.isOnline,
          isDelivering: loc.isDelivering
        }))
      }
    } catch (error) {
      console.error('Error getting location analytics:', error)
      return {
        totalDistance: 0,
        totalTime: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        onlineTime: 0,
        deliveryTime: 0,
        locations: []
      }
    }
  }
}

