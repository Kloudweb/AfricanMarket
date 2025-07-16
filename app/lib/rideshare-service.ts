
import { prisma } from '@/lib/db'
import { RideStatus, RideType } from '@/lib/types'

export class RideshareService {
  
  static async calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): Promise<number> {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  static async estimateDuration(distance: number, rideType: string): Promise<number> {
    const baseSpeed = rideType === 'SHARED' ? 35 : 45 // km/h
    const trafficFactor = 1.3 // Account for traffic
    return Math.ceil((distance / baseSpeed) * 60 * trafficFactor)
  }

  static async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radius: number = 15, // km
    rideType?: string
  ) {
    try {
      const drivers = await prisma.driver.findMany({
        where: {
          isAvailable: true,
          verificationStatus: 'VERIFIED',
          currentLatitude: { not: null },
          currentLongitude: { not: null },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatar: true,
            }
          },
          locations: {
            where: {
              timestamp: {
                gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
              }
            },
            orderBy: {
              timestamp: 'desc'
            },
            take: 1
          },
          driverPreferences: true,
        }
      })

      // Filter by distance and calculate additional info
      const nearbyDrivers = []
      
      for (const driver of drivers) {
        if (!driver.currentLatitude || !driver.currentLongitude) continue
        
        const distance = await this.calculateDistance(
          latitude,
          longitude,
          driver.currentLatitude,
          driver.currentLongitude
        )

        if (distance <= radius) {
          const eta = this.estimateArrivalTime(distance)
          const lastLocation = driver.locations?.[0]

          nearbyDrivers.push({
            ...driver,
            distance: Math.round(distance * 100) / 100,
            eta,
            lastLocationUpdate: lastLocation?.timestamp || driver.updatedAt,
            isOnline: lastLocation?.isOnline || false,
            heading: lastLocation?.heading,
            speed: lastLocation?.speed,
            accuracy: lastLocation?.accuracy,
          })
        }
      }

      return nearbyDrivers
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20) // Limit to top 20 nearest drivers
      
    } catch (error) {
      console.error('Error finding nearby drivers:', error)
      return []
    }
  }

  static estimateArrivalTime(distance: number): number {
    const avgSpeed = 40 // km/h in city
    const timeInHours = distance / avgSpeed
    return Math.ceil(timeInHours * 60) // Convert to minutes
  }

  static async calculateFare(
    distance: number,
    duration: number,
    rideType: string,
    pickupLat: number,
    pickupLon: number,
    scheduledFor?: string
  ) {
    try {
      // Get ride type pricing
      const rideTypeData = await prisma.rideType.findFirst({
        where: { name: rideType, isActive: true }
      })

      const baseFare = rideTypeData?.baseFare || this.getDefaultBaseFare(rideType)
      const perKmRate = rideTypeData?.perKmRate || this.getDefaultPerKmRate(rideType)
      const perMinuteRate = rideTypeData?.perMinuteRate || this.getDefaultPerMinuteRate(rideType)
      const minimumFare = rideTypeData?.minimumFare || this.getDefaultMinimumFare(rideType)

      // Calculate surge multiplier
      const surgeMultiplier = this.getSurgeMultiplier(pickupLat, pickupLon, scheduledFor)
      
      const distanceFare = distance * perKmRate
      const timeFare = duration * perMinuteRate
      const subtotal = baseFare + distanceFare + timeFare
      const surgeFare = subtotal * (surgeMultiplier - 1)
      const totalFare = Math.max(subtotal + surgeFare, minimumFare)

      return {
        baseFare,
        distanceFare,
        timeFare,
        surgeFare,
        surgeMultiplier,
        totalFare: Math.round(totalFare * 100) / 100,
        minimumFare,
        breakdown: {
          distance: Math.round(distance * 100) / 100,
          duration,
          rideType,
          surgeActive: surgeMultiplier > 1,
          estimatedTime: `${Math.ceil(duration)} minutes`,
          estimatedDistance: `${Math.round(distance * 100) / 100} km`
        }
      }
    } catch (error) {
      console.error('Error calculating fare:', error)
      throw error
    }
  }

  static getDefaultBaseFare(rideType: string): number {
    switch (rideType) {
      case 'PREMIUM': return 4.99
      case 'SHARED': return 2.99
      default: return 3.99
    }
  }

  static getDefaultPerKmRate(rideType: string): number {
    switch (rideType) {
      case 'PREMIUM': return 3.50
      case 'SHARED': return 1.50
      default: return 2.50
    }
  }

  static getDefaultPerMinuteRate(rideType: string): number {
    switch (rideType) {
      case 'PREMIUM': return 0.50
      case 'SHARED': return 0.25
      default: return 0.35
    }
  }

  static getDefaultMinimumFare(rideType: string): number {
    switch (rideType) {
      case 'PREMIUM': return 8.99
      case 'SHARED': return 4.99
      default: return 6.99
    }
  }

  static getSurgeMultiplier(pickupLat: number, pickupLon: number, scheduledFor?: string): number {
    const now = new Date()
    const hour = now.getHours()
    
    // Peak hours: 7-9 AM and 5-7 PM
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
    
    // Weekend nights: Friday and Saturday 10 PM - 2 AM
    const isWeekendNight = (now.getDay() === 5 || now.getDay() === 6) && 
                          (hour >= 22 || hour <= 2)
    
    // Bad weather multiplier (simplified)
    const weatherMultiplier = 1.0 // TODO: Integrate with weather API
    
    let surgeMultiplier = 1.0
    
    if (isPeakHour) {
      surgeMultiplier = 1.5
    } else if (isWeekendNight) {
      surgeMultiplier = 1.8
    }
    
    // Apply weather multiplier
    surgeMultiplier *= weatherMultiplier
    
    // Cap at 3.0x
    return Math.min(surgeMultiplier, 3.0)
  }

  static async assignDriverToRide(rideId: string, driverId: string) {
    try {
      const ride = await prisma.ride.update({
        where: { id: rideId },
        data: {
          driverId,
          status: 'ACCEPTED',
          acceptedAt: new Date()
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          driver: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                }
              },
              vehicleType: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleColor: true,
              vehiclePlate: true,
              currentLatitude: true,
              currentLongitude: true,
            }
          }
        }
      })

      // Create ride tracking entry
      await prisma.rideTracking.create({
        data: {
          rideId,
          status: 'ACCEPTED',
          message: 'Driver assigned and en route',
          timestamp: new Date(),
        }
      })

      // Update driver availability
      await prisma.driver.update({
        where: { id: driverId },
        data: { isAvailable: false }
      })

      return ride
    } catch (error) {
      console.error('Error assigning driver to ride:', error)
      throw error
    }
  }

  static async updateRideStatus(rideId: string, status: RideStatus, message?: string) {
    try {
      const updateData: any = { status }
      
      // Set timestamps based on status
      if (status === 'ACCEPTED') {
        updateData.acceptedAt = new Date()
      } else if (status === 'DRIVER_ARRIVING') {
        updateData.arrivedAt = new Date()
      } else if (status === 'IN_PROGRESS') {
        updateData.startedAt = new Date()
      } else if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      } else if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date()
      }

      const ride = await prisma.ride.update({
        where: { id: rideId },
        data: updateData
      })

      // Create tracking entry
      await prisma.rideTracking.create({
        data: {
          rideId,
          status,
          message: message || this.getStatusMessage(status),
          timestamp: new Date(),
        }
      })

      return ride
    } catch (error) {
      console.error('Error updating ride status:', error)
      throw error
    }
  }

  static getStatusMessage(status: RideStatus): string {
    const messages: Record<RideStatus, string> = {
      'PENDING': 'Ride request created',
      'ACCEPTED': 'Driver assigned and en route',
      'DRIVER_ARRIVING': 'Driver is arriving at pickup location',
      'IN_PROGRESS': 'Ride in progress',
      'COMPLETED': 'Ride completed successfully',
      'CANCELLED': 'Ride cancelled'
    }
    return messages[status] || 'Status updated'
  }

  static generateRideNumber(): string {
    const timestamp = Date.now().toString()
    const random = Math.random().toString(36).substring(2, 8)
    return `R${timestamp}${random}`.toUpperCase()
  }
}
