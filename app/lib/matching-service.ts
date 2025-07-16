
import { prisma } from '@/lib/db'
import { 
  DriverAvailabilityStatusType, 
  ServiceType, 
  AssignmentStatus, 
  MatchingAlgorithmType 
} from '@prisma/client'

export interface MatchingLocation {
  latitude: number
  longitude: number
  address?: string
}

export interface MatchingRequest {
  id: string
  type: 'ORDER' | 'RIDE'
  pickupLocation: MatchingLocation
  destinationLocation?: MatchingLocation
  serviceType: ServiceType
  estimatedValue?: number
  priority?: number
  preferredDriverId?: string
  requirements?: {
    vehicleType?: string
    minRating?: number
    maxDistance?: number
    specialRequirements?: string[]
  }
  scheduledFor?: Date
  customerPreferences?: {
    allowShared?: boolean
    preferredGender?: string
    accessibilityNeeds?: string[]
  }
}

export interface DriverMatch {
  driverId: string
  distance: number
  eta: number
  totalScore: number
  scores: {
    distance: number
    rating: number
    completionRate: number
    responseTime: number
    availability: number
  }
  driver: {
    id: string
    rating: number
    totalDeliveries: number
    totalRides: number
    vehicleType: string
    currentLatitude: number
    currentLongitude: number
    user: {
      name: string
      phone: string
    }
  }
  isAvailable: boolean
  batteryLevel?: number
  connectionStrength?: number
}

export interface MatchingResult {
  success: boolean
  matches: DriverMatch[]
  assignmentId?: string
  estimatedWaitTime?: number
  error?: string
  algorithm: {
    type: MatchingAlgorithmType
    version: string
    processingTime: number
  }
}

export interface ReassignmentOptions {
  originalDriverId: string
  rejectionReason?: string
  escalationLevel?: number
  expandRadius?: boolean
  increasePriority?: boolean
}

export class MatchingService {
  private static instance: MatchingService
  private activeConfig: any = null
  private readonly EARTH_RADIUS_KM = 6371

  static getInstance(): MatchingService {
    if (!MatchingService.instance) {
      MatchingService.instance = new MatchingService()
    }
    return MatchingService.instance
  }

  constructor() {
    this.initializeDefaultConfig()
  }

  private async initializeDefaultConfig() {
    try {
      // Get active configuration
      this.activeConfig = await prisma.matchingAlgorithmConfig.findFirst({
        where: { isActive: true }
      })

      // Create default config if none exists
      if (!this.activeConfig) {
        this.activeConfig = await prisma.matchingAlgorithmConfig.upsert({
          where: { name: 'Default Hybrid Algorithm' },
          update: { isActive: true },
          create: {
            name: 'Default Hybrid Algorithm',
            algorithmType: 'HYBRID',
            isActive: true,
            version: '1.0',
            distanceWeight: 0.4,
            ratingWeight: 0.25,
            completionRateWeight: 0.2,
            responseTimeWeight: 0.1,
            availabilityWeight: 0.05,
            maxDistance: 15,
            maxAssignments: 3,
            assignmentTimeout: 60,
            reassignmentDelay: 30,
            minRating: 3.0,
            minCompletionRate: 0.8,
            maxResponseTime: 120,
            enableSurgeMatching: true,
            enableBatchMatching: false,
            enablePredictiveMatching: false
          }
        })
      }
    } catch (error) {
      console.error('Error initializing matching config:', error)
    }
  }

  /**
   * Main matching function - finds the best available drivers for a request
   */
  async findMatches(request: MatchingRequest): Promise<MatchingResult> {
    const startTime = Date.now()
    
    try {
      // Validate request
      if (!this.validateRequest(request)) {
        return {
          success: false,
          matches: [],
          error: 'Invalid request parameters',
          algorithm: {
            type: this.activeConfig?.algorithmType || 'HYBRID',
            version: this.activeConfig?.version || '1.0',
            processingTime: Date.now() - startTime
          }
        }
      }

      // Find available drivers
      const availableDrivers = await this.getAvailableDrivers(request)
      
      if (availableDrivers.length === 0) {
        return {
          success: false,
          matches: [],
          error: 'No available drivers found',
          algorithm: {
            type: this.activeConfig?.algorithmType || 'HYBRID',
            version: this.activeConfig?.version || '1.0',
            processingTime: Date.now() - startTime
          }
        }
      }

      // Calculate matches and scores
      const matches = await this.calculateMatches(request, availableDrivers)
      
      // Sort by total score (descending)
      const sortedMatches = matches.sort((a, b) => b.totalScore - a.totalScore)
      
      // Get top matches based on config
      const topMatches = sortedMatches.slice(0, this.activeConfig?.maxAssignments || 3)

      // Calculate estimated wait time
      const estimatedWaitTime = this.calculateEstimatedWaitTime(topMatches)

      return {
        success: true,
        matches: topMatches,
        estimatedWaitTime,
        algorithm: {
          type: this.activeConfig?.algorithmType || 'HYBRID',
          version: this.activeConfig?.version || '1.0',
          processingTime: Date.now() - startTime
        }
      }
    } catch (error) {
      console.error('Error in findMatches:', error)
      return {
        success: false,
        matches: [],
        error: 'Internal matching service error',
        algorithm: {
          type: this.activeConfig?.algorithmType || 'HYBRID',
          version: this.activeConfig?.version || '1.0',
          processingTime: Date.now() - startTime
        }
      }
    }
  }

  /**
   * Creates assignment for matched drivers
   */
  async createAssignment(request: MatchingRequest, matches: DriverMatch[]): Promise<string[]> {
    const assignmentIds: string[] = []
    
    try {
      const config = await this.getActiveConfig()
      
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const responseTimeout = new Date(Date.now() + (config.assignmentTimeout * 1000))
        
        const assignment = await prisma.matchingAssignment.create({
          data: {
            configId: config.id,
            driverId: match.driverId,
            orderId: request.type === 'ORDER' ? request.id : undefined,
            rideId: request.type === 'RIDE' ? request.id : undefined,
            assignmentType: request.type,
            status: 'PENDING',
            priority: 10 - i, // Higher priority for better matches
            totalScore: match.totalScore,
            distanceScore: match.scores.distance,
            ratingScore: match.scores.rating,
            completionRateScore: match.scores.completionRate,
            responseTimeScore: match.scores.responseTime,
            availabilityScore: match.scores.availability,
            distance: match.distance,
            eta: match.eta,
            responseTimeout,
            driverLatitude: match.driver.currentLatitude,
            driverLongitude: match.driver.currentLongitude,
            offeredAt: new Date()
          }
        })

        assignmentIds.push(assignment.id)

        // Create assignment history entry
        await prisma.driverAssignmentHistory.create({
          data: {
            driverId: match.driverId,
            orderId: request.type === 'ORDER' ? request.id : undefined,
            rideId: request.type === 'RIDE' ? request.id : undefined,
            assignmentId: assignment.id,
            assignmentType: request.type,
            status: 'PENDING',
            priority: 10 - i,
            distance: match.distance,
            eta: match.eta,
            matchingScore: match.totalScore,
            algorithmVersion: config.version,
            factors: {
              distanceScore: match.scores.distance,
              ratingScore: match.scores.rating,
              completionRateScore: match.scores.completionRate,
              responseTimeScore: match.scores.responseTime,
              availabilityScore: match.scores.availability
            }
          }
        })
      }

      return assignmentIds
    } catch (error) {
      console.error('Error creating assignments:', error)
      throw error
    }
  }

  /**
   * Handles driver response to assignment
   */
  async handleDriverResponse(
    assignmentId: string, 
    driverId: string, 
    response: 'ACCEPTED' | 'REJECTED',
    rejectionReason?: string
  ): Promise<{ success: boolean; requiresReassignment: boolean }> {
    try {
      const assignment = await prisma.matchingAssignment.findUnique({
        where: { id: assignmentId },
        include: { order: true, ride: true }
      })

      if (!assignment) {
        throw new Error('Assignment not found')
      }

      if (assignment.driverId !== driverId) {
        throw new Error('Unauthorized')
      }

      const responseTime = Math.floor((Date.now() - assignment.offeredAt!.getTime()) / 1000)

      if (response === 'ACCEPTED') {
        // Update assignment status
        await prisma.matchingAssignment.update({
          where: { id: assignmentId },
          data: {
            status: 'ACCEPTED',
            respondedAt: new Date(),
            acceptedAt: new Date(),
            responseTime,
            successful: true
          }
        })

        // Assign driver to order/ride
        if (assignment.orderId) {
          await prisma.order.update({
            where: { id: assignment.orderId },
            data: { driverId }
          })
        } else if (assignment.rideId) {
          await prisma.ride.update({
            where: { id: assignment.rideId },
            data: { driverId }
          })
        }

        // Cancel other pending assignments for this request
        await prisma.matchingAssignment.updateMany({
          where: {
            orderId: assignment.orderId,
            rideId: assignment.rideId,
            status: 'PENDING',
            id: { not: assignmentId }
          },
          data: { status: 'CANCELLED' }
        })

        // Update assignment history
        await prisma.driverAssignmentHistory.updateMany({
          where: { assignmentId },
          data: {
            status: 'ACCEPTED',
            responseTime,
            acceptedAt: new Date()
          }
        })

        return { success: true, requiresReassignment: false }
      } else {
        // Handle rejection
        await prisma.matchingAssignment.update({
          where: { id: assignmentId },
          data: {
            status: 'REJECTED',
            respondedAt: new Date(),
            rejectedAt: new Date(),
            responseTime,
            rejectionReason
          }
        })

        // Update assignment history
        await prisma.driverAssignmentHistory.updateMany({
          where: { assignmentId },
          data: {
            status: 'REJECTED',
            responseTime,
            rejectedAt: new Date(),
            rejectionReason
          }
        })

        // Check if reassignment is needed
        const pendingAssignments = await prisma.matchingAssignment.count({
          where: {
            orderId: assignment.orderId,
            rideId: assignment.rideId,
            status: 'PENDING'
          }
        })

        if (pendingAssignments === 0) {
          // Add to reassignment queue
          await this.addToReassignmentQueue(assignment, rejectionReason)
          return { success: true, requiresReassignment: true }
        }

        return { success: true, requiresReassignment: false }
      }
    } catch (error) {
      console.error('Error handling driver response:', error)
      throw error
    }
  }

  /**
   * Processes reassignment queue
   */
  async processReassignmentQueue(): Promise<void> {
    try {
      const queueItems = await prisma.reassignmentQueue.findMany({
        where: { status: 'PENDING' },
        include: { order: true, ride: true },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 10
      })

      for (const item of queueItems) {
        await this.processReassignmentItem(item)
      }
    } catch (error) {
      console.error('Error processing reassignment queue:', error)
    }
  }

  /**
   * Get available drivers based on request criteria
   */
  private async getAvailableDrivers(request: MatchingRequest): Promise<any[]> {
    const config = await this.getActiveConfig()
    const maxDistance = request.requirements?.maxDistance || config.maxDistance
    
    // Base query for available drivers
    const drivers = await prisma.driver.findMany({
      where: {
        isAvailable: true,
        verificationStatus: 'VERIFIED',
        rating: { gte: request.requirements?.minRating || config.minRating },
        // Add service type filter
        OR: [
          { serviceTypes: { has: request.serviceType } },
          { serviceTypes: { has: 'BOTH' } }
        ]
      },
      include: {
        user: {
          select: {
            name: true,
            phone: true
          }
        },
        availabilityStatus: {
          where: { endTime: null },
          orderBy: { startTime: 'desc' },
          take: 1
        },
        performanceMetrics: {
          where: { period: 'weekly' },
          orderBy: { periodStart: 'desc' },
          take: 1
        },
        matchingPreferences: true,
        batteryStatus: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        connectionStatus: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    })

    // Filter by distance and availability
    const filteredDrivers = drivers.filter(driver => {
      // Check location availability
      if (!driver.currentLatitude || !driver.currentLongitude) {
        return false
      }

      // Check current availability status
      const currentStatus = driver.availabilityStatus[0]
      if (!currentStatus || currentStatus.status !== 'AVAILABLE') {
        return false
      }

      // Check distance
      const distance = this.calculateDistance(
        request.pickupLocation.latitude,
        request.pickupLocation.longitude,
        driver.currentLatitude,
        driver.currentLongitude
      )

      if (distance > maxDistance) {
        return false
      }

      // Check battery level
      const batteryStatus = driver.batteryStatus[0]
      if (batteryStatus && batteryStatus.criticalBattery) {
        return false
      }

      // Check connection status
      const connectionStatus = driver.connectionStatus[0]
      if (connectionStatus && !connectionStatus.isConnected) {
        return false
      }

      // Check matching preferences
      const preferences = driver.matchingPreferences
      if (preferences) {
        if (distance > preferences.maxDistance) {
          return false
        }
        
        if (request.estimatedValue) {
          if (preferences.maxOrderValue && request.estimatedValue > preferences.maxOrderValue) {
            return false
          }
          if (preferences.minOrderValue && request.estimatedValue < preferences.minOrderValue) {
            return false
          }
        }
      }

      return true
    })

    return filteredDrivers
  }

  /**
   * Calculate matching scores for drivers
   */
  private async calculateMatches(request: MatchingRequest, drivers: any[]): Promise<DriverMatch[]> {
    const config = await this.getActiveConfig()
    const matches: DriverMatch[] = []

    for (const driver of drivers) {
      const distance = this.calculateDistance(
        request.pickupLocation.latitude,
        request.pickupLocation.longitude,
        driver.currentLatitude,
        driver.currentLongitude
      )

      const eta = this.calculateETA(distance, driver.vehicleType)
      const scores = await this.calculateDriverScores(driver, distance, request)
      
      const totalScore = (
        scores.distance * config.distanceWeight +
        scores.rating * config.ratingWeight +
        scores.completionRate * config.completionRateWeight +
        scores.responseTime * config.responseTimeWeight +
        scores.availability * config.availabilityWeight
      )

      const match: DriverMatch = {
        driverId: driver.id,
        distance,
        eta,
        totalScore,
        scores,
        driver: {
          id: driver.id,
          rating: driver.rating,
          totalDeliveries: driver.totalDeliveries,
          totalRides: driver.totalRides,
          vehicleType: driver.vehicleType,
          currentLatitude: driver.currentLatitude,
          currentLongitude: driver.currentLongitude,
          user: driver.user
        },
        isAvailable: driver.isAvailable,
        batteryLevel: driver.batteryStatus[0]?.batteryLevel,
        connectionStrength: driver.connectionStatus[0]?.signalStrength
      }

      matches.push(match)
    }

    return matches
  }

  /**
   * Calculate individual driver scores
   */
  private async calculateDriverScores(driver: any, distance: number, request: MatchingRequest): Promise<{
    distance: number
    rating: number
    completionRate: number
    responseTime: number
    availability: number
  }> {
    const config = await this.getActiveConfig()
    
    // Distance score (closer = better, max score at 0km, min score at maxDistance)
    const distanceScore = Math.max(0, 1 - (distance / config.maxDistance))
    
    // Rating score (normalized to 0-1 scale)
    const ratingScore = Math.max(0, (driver.rating - 1) / 4) // 1-5 scale to 0-1
    
    // Completion rate score
    const metrics = driver.performanceMetrics[0]
    const completionRate = metrics?.completionRate || 0.5
    const completionRateScore = Math.min(1, completionRate / config.minCompletionRate)
    
    // Response time score (faster = better)
    const avgResponseTime = metrics?.avgResponseTime || 60
    const responseTimeScore = Math.max(0, 1 - (avgResponseTime / config.maxResponseTime))
    
    // Availability score (factors in battery, connection, etc.)
    let availabilityScore = 0.5
    
    const batteryStatus = driver.batteryStatus[0]
    if (batteryStatus) {
      if (batteryStatus.batteryLevel >= 50) availabilityScore += 0.2
      if (batteryStatus.batteryLevel >= 80) availabilityScore += 0.1
      if (batteryStatus.lowBattery) availabilityScore -= 0.2
    }
    
    const connectionStatus = driver.connectionStatus[0]
    if (connectionStatus) {
      if (connectionStatus.signalStrength >= 70) availabilityScore += 0.1
      if (connectionStatus.connectionType === 'WIFI') availabilityScore += 0.1
    }
    
    availabilityScore = Math.max(0, Math.min(1, availabilityScore))
    
    return {
      distance: distanceScore,
      rating: ratingScore,
      completionRate: completionRateScore,
      responseTime: responseTimeScore,
      availability: availabilityScore
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return this.EARTH_RADIUS_KM * c
  }

  /**
   * Calculate ETA based on distance and vehicle type
   */
  private calculateETA(distance: number, vehicleType: string): number {
    // Average speeds (km/h) by vehicle type
    const speeds = {
      'BICYCLE': 15,
      'MOTORCYCLE': 35,
      'CAR': 30,
      'VAN': 25,
      'TRUCK': 20
    }
    
    const speed = speeds[vehicleType as keyof typeof speeds] || 30
    const timeHours = distance / speed
    const timeMinutes = Math.ceil(timeHours * 60)
    
    // Add buffer time for traffic, etc.
    return Math.max(5, timeMinutes + 5)
  }

  /**
   * Calculate estimated wait time
   */
  private calculateEstimatedWaitTime(matches: DriverMatch[]): number {
    if (matches.length === 0) return 0
    
    // Return ETA of the best match
    return matches[0].eta
  }

  /**
   * Add request to reassignment queue
   */
  private async addToReassignmentQueue(assignment: any, rejectionReason?: string): Promise<void> {
    await prisma.reassignmentQueue.create({
      data: {
        orderId: assignment.orderId,
        rideId: assignment.rideId,
        assignmentType: assignment.assignmentType,
        priority: assignment.priority + 1, // Increase priority for reassignment
        originalDriverId: assignment.driverId,
        originalRejectionReason: rejectionReason,
        status: 'PENDING'
      }
    })
  }

  /**
   * Process individual reassignment item
   */
  private async processReassignmentItem(item: any): Promise<void> {
    try {
      // Mark as processing
      await prisma.reassignmentQueue.update({
        where: { id: item.id },
        data: { 
          status: 'PROCESSING',
          processedAt: new Date()
        }
      })

      // Create new matching request
      const request: MatchingRequest = {
        id: item.orderId || item.rideId,
        type: item.assignmentType,
        pickupLocation: {
          latitude: item.order?.vendor?.latitude || item.ride?.pickupLatitude,
          longitude: item.order?.vendor?.longitude || item.ride?.pickupLongitude
        },
        destinationLocation: item.ride ? {
          latitude: item.ride.destinationLatitude,
          longitude: item.ride.destinationLongitude
        } : undefined,
        serviceType: item.assignmentType === 'ORDER' ? 'FOOD_DELIVERY' : 'RIDESHARE',
        estimatedValue: item.order?.totalAmount || item.ride?.estimatedFare,
        priority: item.priority
      }

      // Increase search radius for reassignments
      if (item.attempt > 1) {
        request.requirements = {
          maxDistance: 20 + (item.attempt * 5) // Expand radius with each attempt
        }
      }

      // Find new matches
      const result = await this.findMatches(request)
      
      if (result.success && result.matches.length > 0) {
        // Create new assignments
        await this.createAssignment(request, result.matches)
        
        // Mark as completed
        await prisma.reassignmentQueue.update({
          where: { id: item.id },
          data: { 
            status: 'COMPLETED',
            completedAt: new Date()
          }
        })
      } else {
        // Check if max attempts reached
        if (item.attempt >= item.maxAttempts) {
          await prisma.reassignmentQueue.update({
            where: { id: item.id },
            data: { 
              status: 'FAILED',
              completedAt: new Date()
            }
          })
        } else {
          // Increment attempt and reset status
          await prisma.reassignmentQueue.update({
            where: { id: item.id },
            data: { 
              status: 'PENDING',
              attempt: item.attempt + 1,
              processedAt: null
            }
          })
        }
      }
    } catch (error) {
      console.error('Error processing reassignment item:', error)
      await prisma.reassignmentQueue.update({
        where: { id: item.id },
        data: { status: 'FAILED' }
      })
    }
  }

  /**
   * Validate matching request
   */
  private validateRequest(request: MatchingRequest): boolean {
    if (!request.id || !request.type) return false
    if (!request.pickupLocation?.latitude || !request.pickupLocation?.longitude) return false
    if (!request.serviceType) return false
    
    if (request.type === 'RIDE') {
      if (!request.destinationLocation?.latitude || !request.destinationLocation?.longitude) {
        return false
      }
    }
    
    return true
  }

  /**
   * Get active configuration
   */
  private async getActiveConfig(): Promise<any> {
    if (!this.activeConfig) {
      await this.initializeDefaultConfig()
    }
    return this.activeConfig
  }

  /**
   * Update driver availability status
   */
  async updateDriverAvailability(
    driverId: string, 
    status: DriverAvailabilityStatusType,
    location?: { latitude: number; longitude: number },
    metadata?: any
  ): Promise<void> {
    try {
      // End previous status
      await prisma.driverAvailabilityStatus.updateMany({
        where: {
          driverId,
          endTime: null
        },
        data: { endTime: new Date() }
      })

      // Create new status
      await prisma.driverAvailabilityStatus.create({
        data: {
          driverId,
          status,
          latitude: location?.latitude,
          longitude: location?.longitude,
          metadata
        }
      })

      // Update driver availability flag
      const isAvailable = status === 'AVAILABLE'
      await prisma.driver.update({
        where: { id: driverId },
        data: { isAvailable }
      })
    } catch (error) {
      console.error('Error updating driver availability:', error)
      throw error
    }
  }

  /**
   * Update driver performance metrics
   */
  async updateDriverPerformanceMetrics(driverId: string): Promise<void> {
    try {
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      // Get assignments for this week
      const assignments = await prisma.driverAssignmentHistory.findMany({
        where: {
          driverId,
          assignedAt: { gte: weekStart, lte: weekEnd }
        }
      })

      if (assignments.length === 0) return

      // Calculate metrics
      const totalAssignments = assignments.length
      const acceptedAssignments = assignments.filter(a => a.status === 'ACCEPTED').length
      const rejectedAssignments = assignments.filter(a => a.status === 'REJECTED').length
      const expiredAssignments = assignments.filter(a => a.status === 'EXPIRED').length
      const completedAssignments = assignments.filter(a => a.status === 'COMPLETED').length

      const acceptanceRate = totalAssignments > 0 ? acceptedAssignments / totalAssignments : 0
      const completionRate = acceptedAssignments > 0 ? completedAssignments / acceptedAssignments : 0

      const responseTimes = assignments.filter(a => a.responseTime).map(a => a.responseTime!)
      const avgResponseTime = responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0

      // Update or create performance metrics
      const existingMetrics = await prisma.driverPerformanceMetrics.findFirst({
        where: {
          driverId,
          period: 'weekly',
          periodStart: weekStart
        }
      })

      if (existingMetrics) {
        await prisma.driverPerformanceMetrics.update({
          where: { id: existingMetrics.id },
          data: {
            totalAssignments,
            acceptedAssignments,
            rejectedAssignments,
            expiredAssignments,
            completedAssignments,
            acceptanceRate,
            completionRate,
            avgResponseTime
          }
        })
      } else {
        await prisma.driverPerformanceMetrics.create({
          data: {
            driverId,
            period: 'weekly',
            periodStart: weekStart,
            periodEnd: weekEnd,
            totalAssignments,
            acceptedAssignments,
            rejectedAssignments,
            expiredAssignments,
            completedAssignments,
            acceptanceRate,
            completionRate,
            avgResponseTime
          }
        })
      }
    } catch (error) {
      console.error('Error updating driver performance metrics:', error)
    }
  }

  /**
   * Get matching statistics
   */
  async getMatchingStatistics(timeRange: { start: Date; end: Date }): Promise<any> {
    try {
      const assignments = await prisma.matchingAssignment.findMany({
        where: {
          assignedAt: { gte: timeRange.start, lte: timeRange.end }
        },
        include: {
          driver: {
            include: {
              user: { select: { name: true } }
            }
          }
        }
      })

      const totalAssignments = assignments.length
      const successfulAssignments = assignments.filter(a => a.successful).length
      const failedAssignments = totalAssignments - successfulAssignments

      const responseTimes = assignments.filter(a => a.responseTime).map(a => a.responseTime!)
      const avgResponseTime = responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0

      const acceptanceRate = totalAssignments > 0 ? 
        (assignments.filter(a => a.status === 'ACCEPTED').length / totalAssignments) * 100 : 0

      return {
        totalAssignments,
        successfulAssignments,
        failedAssignments,
        successRate: totalAssignments > 0 ? (successfulAssignments / totalAssignments) * 100 : 0,
        avgResponseTime,
        acceptanceRate,
        assignments: assignments.slice(0, 50) // Recent assignments
      }
    } catch (error) {
      console.error('Error getting matching statistics:', error)
      throw error
    }
  }
}

// Export singleton instance
export const matchingService = MatchingService.getInstance()
