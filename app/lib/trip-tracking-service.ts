
import { prisma } from '@/lib/db'
import { TripStatus } from './types'

export class TripTrackingService {
  // Update trip location and status
  static async updateTripLocation(data: {
    rideId: string
    driverId: string
    latitude: number
    longitude: number
    heading?: number
    speed?: number
    altitude?: number
    accuracy?: number
    tripStatus: TripStatus
    distanceTraveled?: number
    timeElapsed?: number
    currentAddress?: string
    nextWaypoint?: string
    distanceToDestination?: number
    batteryLevel?: number
    connectionType?: string
    signalStrength?: number
    metadata?: any
  }) {
    try {
      // Create trip tracking entry
      const tripTracking = await prisma.tripTracking.create({
        data: {
          rideId: data.rideId,
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed,
          altitude: data.altitude,
          accuracy: data.accuracy,
          tripStatus: data.tripStatus,
          distanceTraveled: data.distanceTraveled,
          timeElapsed: data.timeElapsed,
          currentAddress: data.currentAddress,
          nextWaypoint: data.nextWaypoint,
          distanceToDestination: data.distanceToDestination,
          batteryLevel: data.batteryLevel,
          connectionType: data.connectionType,
          signalStrength: data.signalStrength,
          metadata: data.metadata,
        },
      })

      // Update driver's current location
      await prisma.driver.update({
        where: { id: data.driverId },
        data: {
          currentLatitude: data.latitude,
          currentLongitude: data.longitude,
        }
      })

      // Update driver location history
      await prisma.driverLocation.create({
        data: {
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed,
          accuracy: data.accuracy,
          isOnline: true,
          isDelivering: data.tripStatus === 'IN_PROGRESS',
          batteryLevel: data.batteryLevel,
        }
      })

      return tripTracking
    } catch (error) {
      console.error('Error updating trip location:', error)
      throw error
    }
  }

  // Get real-time trip tracking data
  static async getTripTracking(rideId: string, userId: string) {
    try {
      // Verify user has access to this ride
      const ride = await prisma.ride.findFirst({
        where: {
          id: rideId,
          OR: [
            { customerId: userId },
            { driver: { userId: userId } }
          ]
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatar: true,
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
                  avatar: true,
                }
              },
              vehicleType: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleColor: true,
              vehiclePlate: true,
              rating: true,
              totalRides: true,
              currentLatitude: true,
              currentLongitude: true,
            }
          }
        }
      })

      if (!ride) {
        throw new Error('Ride not found or unauthorized')
      }

      // Get latest trip tracking data
      const latestTracking = await prisma.tripTracking.findFirst({
        where: { rideId },
        orderBy: { timestamp: 'desc' },
      })

      // Get trip route if available
      const tripRoute = await prisma.tripRoute.findFirst({
        where: { rideId, isActive: true },
        include: {
          waypoints: {
            orderBy: { sequence: 'asc' },
          }
        }
      })

      // Get latest ETA
      const latestETA = await prisma.tripETA.findFirst({
        where: { rideId },
        orderBy: { createdAt: 'desc' },
      })

      return {
        ride,
        latestTracking,
        tripRoute,
        latestETA,
        isLiveTracking: latestTracking ? 
          (new Date().getTime() - new Date(latestTracking.timestamp).getTime()) < 30000 : false // 30 seconds threshold
      }
    } catch (error) {
      console.error('Error getting trip tracking:', error)
      throw error
    }
  }

  // Get trip tracking history
  static async getTripTrackingHistory(rideId: string, userId: string, limit: number = 100) {
    try {
      // Verify user has access to this ride
      const ride = await prisma.ride.findFirst({
        where: {
          id: rideId,
          OR: [
            { customerId: userId },
            { driver: { userId: userId } }
          ]
        }
      })

      if (!ride) {
        throw new Error('Ride not found or unauthorized')
      }

      const trackingHistory = await prisma.tripTracking.findMany({
        where: { rideId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      })

      return trackingHistory.reverse() // Return in chronological order
    } catch (error) {
      console.error('Error getting trip tracking history:', error)
      throw error
    }
  }

  // Calculate distance between two points using Haversine formula
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  // Calculate ETA based on current location and destination
  static async calculateETA(data: {
    rideId: string
    currentLatitude: number
    currentLongitude: number
    destinationLatitude: number
    destinationLongitude: number
    currentSpeed?: number
    trafficCondition?: string
    weatherCondition?: string
  }) {
    try {
      const distance = this.calculateDistance(
        data.currentLatitude,
        data.currentLongitude,
        data.destinationLatitude,
        data.destinationLongitude
      )

      // Base calculation
      const baseSpeed = data.currentSpeed || 40 // km/h default
      let estimatedTime = (distance / baseSpeed) * 60 // minutes

      // Apply traffic multiplier
      const trafficMultipliers = {
        'LIGHT': 1.0,
        'MODERATE': 1.3,
        'HEAVY': 1.7,
        'SEVERE': 2.2,
      }
      const trafficMultiplier = trafficMultipliers[data.trafficCondition as keyof typeof trafficMultipliers] || 1.0

      // Apply weather multiplier
      const weatherMultipliers = {
        'CLEAR': 1.0,
        'RAIN': 1.2,
        'SNOW': 1.5,
        'FOG': 1.3,
      }
      const weatherMultiplier = weatherMultipliers[data.weatherCondition as keyof typeof weatherMultipliers] || 1.0

      estimatedTime = estimatedTime * trafficMultiplier * weatherMultiplier

      const estimatedArrival = new Date(Date.now() + estimatedTime * 60 * 1000)
      const confidence = Math.max(0.6, 1.0 - (distance * 0.1)) // Lower confidence for longer distances

      // Save ETA to database
      const etaRecord = await prisma.tripETA.create({
        data: {
          rideId: data.rideId,
          estimatedArrival,
          distanceRemaining: distance,
          timeRemaining: Math.round(estimatedTime * 60), // seconds
          currentSpeed: data.currentSpeed,
          trafficCondition: data.trafficCondition,
          weatherCondition: data.weatherCondition,
          confidence,
          varianceRange: Math.round(estimatedTime * 0.2), // ±20% variance
          calculationMethod: 'REALTIME',
          dataSource: 'GPS',
        }
      })

      return {
        estimatedArrival,
        distanceRemaining: distance,
        timeRemaining: Math.round(estimatedTime * 60),
        confidence,
        varianceRange: Math.round(estimatedTime * 0.2),
        etaRecord,
      }
    } catch (error) {
      console.error('Error calculating ETA:', error)
      throw error
    }
  }

  // Monitor speed and detect violations
  static async monitorSpeed(data: {
    rideId: string
    driverId: string
    currentSpeed: number
    speedLimit: number
    latitude: number
    longitude: number
    address?: string
  }) {
    try {
      const isViolation = data.currentSpeed > data.speedLimit
      let violationSeverity = null

      if (isViolation) {
        const excessSpeed = data.currentSpeed - data.speedLimit
        const excessPercentage = (excessSpeed / data.speedLimit) * 100

        if (excessPercentage <= 10) {
          violationSeverity = 'MINOR'
        } else if (excessPercentage <= 20) {
          violationSeverity = 'MODERATE'
        } else if (excessPercentage <= 35) {
          violationSeverity = 'MAJOR'
        } else {
          violationSeverity = 'SEVERE'
        }
      }

      const speedRecord = await prisma.speedMonitoring.create({
        data: {
          rideId: data.rideId,
          driverId: data.driverId,
          currentSpeed: data.currentSpeed,
          speedLimit: data.speedLimit,
          isViolation,
          violationSeverity,
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
        }
      })

      return {
        isViolation,
        violationSeverity,
        speedRecord,
      }
    } catch (error) {
      console.error('Error monitoring speed:', error)
      throw error
    }
  }

  // Create trip route
  static async createTripRoute(data: {
    rideId: string
    routeData: any
    totalDistance: number
    totalDuration: number
    waypoints?: Array<{
      sequence: number
      latitude: number
      longitude: number
      address?: string
      instruction?: string
      maneuver?: string
      distance?: number
      duration?: number
    }>
  }) {
    try {
      const tripRoute = await prisma.tripRoute.create({
        data: {
          rideId: data.rideId,
          routeData: data.routeData,
          totalDistance: data.totalDistance,
          totalDuration: data.totalDuration,
        }
      })

      // Create waypoints if provided
      if (data.waypoints && data.waypoints.length > 0) {
        await prisma.tripWaypoint.createMany({
          data: data.waypoints.map(waypoint => ({
            routeId: tripRoute.id,
            sequence: waypoint.sequence,
            latitude: waypoint.latitude,
            longitude: waypoint.longitude,
            address: waypoint.address,
            instruction: waypoint.instruction,
            maneuver: waypoint.maneuver,
            distance: waypoint.distance,
            duration: waypoint.duration,
          }))
        })
      }

      return tripRoute
    } catch (error) {
      console.error('Error creating trip route:', error)
      throw error
    }
  }

  // Get trip analytics
  static async getTripAnalytics(rideId: string) {
    try {
      // Get all tracking points for the ride
      const trackingPoints = await prisma.tripTracking.findMany({
        where: { rideId },
        orderBy: { timestamp: 'asc' },
      })

      if (trackingPoints.length === 0) {
        return null
      }

      // Calculate analytics
      const speeds = trackingPoints.filter(p => p.speed).map(p => p.speed!)
      const distances = trackingPoints.filter(p => p.distanceTraveled).map(p => p.distanceTraveled!)
      
      const analytics = {
        totalDistance: distances.length > 0 ? Math.max(...distances) : 0,
        totalDuration: trackingPoints.length > 0 ? 
          (new Date(trackingPoints[trackingPoints.length - 1].timestamp).getTime() - 
           new Date(trackingPoints[0].timestamp).getTime()) / 1000 : 0,
        averageSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
        maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
        minSpeed: speeds.length > 0 ? Math.min(...speeds) : 0,
        trackingPoints: trackingPoints.length,
      }

      // Save analytics to database
      await prisma.tripAnalytics.upsert({
        where: { rideId },
        create: {
          rideId,
          actualDistance: analytics.totalDistance,
          actualDuration: analytics.totalDuration,
          averageSpeed: analytics.averageSpeed,
          maxSpeed: analytics.maxSpeed,
          minSpeed: analytics.minSpeed,
        },
        update: {
          actualDistance: analytics.totalDistance,
          actualDuration: analytics.totalDuration,
          averageSpeed: analytics.averageSpeed,
          maxSpeed: analytics.maxSpeed,
          minSpeed: analytics.minSpeed,
        }
      })

      return analytics
    } catch (error) {
      console.error('Error getting trip analytics:', error)
      throw error
    }
  }
}
