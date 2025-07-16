
import { prisma } from '@/lib/db'
import { SafetyAlertType, IncidentType, TripShareStatus } from '@/lib/types'

export class SafetyService {
  // Create emergency contact
  static async createEmergencyContact(data: {
    userId: string
    name: string
    phone: string
    email?: string
    relationship?: string
    priority?: number
    isPrimary?: boolean
    notifyTrips?: boolean
    notifyEmergency?: boolean
    notifyLate?: boolean
  }) {
    try {
      // If this is set as primary, make sure no other contact is primary
      if (data.isPrimary) {
        await prisma.emergencyContact.updateMany({
          where: { userId: data.userId },
          data: { isPrimary: false }
        })
      }

      const emergencyContact = await prisma.emergencyContact.create({
        data: {
          userId: data.userId,
          name: data.name,
          phone: data.phone,
          email: data.email,
          relationship: data.relationship,
          priority: data.priority || 1,
          isPrimary: data.isPrimary || false,
          notifyTrips: data.notifyTrips || false,
          notifyEmergency: data.notifyEmergency || true,
          notifyLate: data.notifyLate || true,
        }
      })

      return emergencyContact
    } catch (error) {
      console.error('Error creating emergency contact:', error)
      throw error
    }
  }

  // Get emergency contacts for a user
  static async getEmergencyContacts(userId: string) {
    try {
      const contacts = await prisma.emergencyContact.findMany({
        where: { userId, isActive: true },
        orderBy: { priority: 'asc' },
      })

      return contacts
    } catch (error) {
      console.error('Error getting emergency contacts:', error)
      throw error
    }
  }

  // Trigger safety alert
  static async triggerSafetyAlert(data: {
    rideId: string
    triggeredBy: string
    alertType: SafetyAlertType
    severity?: string
    message?: string
    location?: string
    latitude?: number
    longitude?: number
    hasRecording?: boolean
    recordingUrl?: string
    recordingDuration?: number
  }) {
    try {
      // Create safety alert
      const safetyAlert = await prisma.safetyAlert.create({
        data: {
          rideId: data.rideId,
          triggeredBy: data.triggeredBy,
          alertType: data.alertType,
          severity: data.severity || 'MEDIUM',
          message: data.message,
          location: data.location,
          latitude: data.latitude,
          longitude: data.longitude,
          hasRecording: data.hasRecording || false,
          recordingUrl: data.recordingUrl,
          recordingDuration: data.recordingDuration,
        }
      })

      // Get user's emergency contacts
      const emergencyContacts = await prisma.emergencyContact.findMany({
        where: { 
          userId: data.triggeredBy,
          isActive: true,
          notifyEmergency: true,
        },
        orderBy: { priority: 'asc' },
      })

      // Notify emergency contacts
      for (const contact of emergencyContacts) {
        await this.notifyEmergencyContact(safetyAlert.id, contact.id)
      }

      // For critical alerts, also notify authorities
      if (data.severity === 'CRITICAL' || data.alertType === 'PANIC_BUTTON') {
        await this.notifyAuthorities(safetyAlert.id)
      }

      return safetyAlert
    } catch (error) {
      console.error('Error triggering safety alert:', error)
      throw error
    }
  }

  // Share trip with contacts
  static async shareTripWithContacts(data: {
    rideId: string
    sharedBy: string
    contacts: Array<{
      contactName?: string
      contactPhone?: string
      contactEmail?: string
    }>
    shareLocation?: boolean
    shareETA?: boolean
    shareDriver?: boolean
    shareRoute?: boolean
    expiresAt?: Date
  }) {
    try {
      const shareToken = this.generateShareToken()
      const tripShares = []

      for (const contact of data.contacts) {
        const tripShare = await prisma.tripShare.create({
          data: {
            rideId: data.rideId,
            sharedBy: data.sharedBy,
            sharedWith: contact.contactPhone || contact.contactEmail || '',
            contactName: contact.contactName,
            contactPhone: contact.contactPhone,
            contactEmail: contact.contactEmail,
            shareToken: `${shareToken}_${Date.now()}`,
            shareLocation: data.shareLocation ?? true,
            shareETA: data.shareETA ?? true,
            shareDriver: data.shareDriver ?? true,
            shareRoute: data.shareRoute ?? true,
            expiresAt: data.expiresAt,
          }
        })

        tripShares.push(tripShare)

        // Send notification to contact
        await this.notifyTripShare(tripShare.id)
      }

      return tripShares
    } catch (error) {
      console.error('Error sharing trip with contacts:', error)
      throw error
    }
  }

  // Get shared trip details
  static async getSharedTripDetails(shareToken: string) {
    try {
      const tripShare = await prisma.tripShare.findFirst({
        where: { 
          shareToken,
          status: 'ACTIVE',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          ride: {
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
                  currentLatitude: true,
                  currentLongitude: true,
                }
              }
            }
          }
        }
      })

      if (!tripShare) {
        throw new Error('Trip share not found or expired')
      }

      // Get latest trip tracking if location sharing is enabled
      let latestTracking = null
      if (tripShare.shareLocation) {
        latestTracking = await prisma.tripTracking.findFirst({
          where: { rideId: tripShare.rideId },
          orderBy: { timestamp: 'desc' },
        })
      }

      // Get ETA if ETA sharing is enabled
      let latestETA = null
      if (tripShare.shareETA) {
        latestETA = await prisma.tripETA.findFirst({
          where: { rideId: tripShare.rideId },
          orderBy: { createdAt: 'desc' },
        })
      }

      // Get route if route sharing is enabled
      let tripRoute = null
      if (tripShare.shareRoute) {
        tripRoute = await prisma.tripRoute.findFirst({
          where: { rideId: tripShare.rideId, isActive: true },
          include: {
            waypoints: {
              orderBy: { sequence: 'asc' },
            }
          }
        })
      }

      return {
        tripShare,
        latestTracking,
        latestETA,
        tripRoute,
      }
    } catch (error) {
      console.error('Error getting shared trip details:', error)
      throw error
    }
  }

  // Report safety incident
  static async reportSafetyIncident(data: {
    rideId: string
    reportedBy: string
    incidentType: IncidentType
    title: string
    description: string
    severity?: string
    latitude?: number
    longitude?: number
    address?: string
    photos?: string[]
    videos?: string[]
    audioRecording?: string
  }) {
    try {
      const incident = await prisma.safetyIncident.create({
        data: {
          rideId: data.rideId,
          reportedBy: data.reportedBy,
          incidentType: data.incidentType,
          title: data.title,
          description: data.description,
          severity: data.severity || 'MEDIUM',
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
          photos: data.photos || [],
          videos: data.videos || [],
          audioRecording: data.audioRecording,
        }
      })

      return incident
    } catch (error) {
      console.error('Error reporting safety incident:', error)
      throw error
    }
  }

  // Get safety incidents for a ride
  static async getSafetyIncidents(rideId: string, userId: string) {
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

      const incidents = await prisma.safetyIncident.findMany({
        where: { rideId },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      })

      return incidents
    } catch (error) {
      console.error('Error getting safety incidents:', error)
      throw error
    }
  }

  // Get safety alerts for a ride
  static async getSafetyAlerts(rideId: string, userId: string) {
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

      const alerts = await prisma.safetyAlert.findMany({
        where: { rideId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      })

      return alerts
    } catch (error) {
      console.error('Error getting safety alerts:', error)
      throw error
    }
  }

  // Private helper methods
  private static generateShareToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  private static async notifyEmergencyContact(alertId: string, contactId: string) {
    try {
      await prisma.safetyAlert.update({
        where: { id: alertId },
        data: {
          emergencyContactId: contactId,
          notificationSent: true,
          notificationSentAt: new Date(),
        }
      })

      // TODO: Implement actual notification sending (SMS, email, push)
      console.log(`Emergency notification sent to contact ${contactId} for alert ${alertId}`)
    } catch (error) {
      console.error('Error notifying emergency contact:', error)
    }
  }

  private static async notifyAuthorities(alertId: string) {
    try {
      await prisma.safetyAlert.update({
        where: { id: alertId },
        data: {
          authoritiesNotified: true,
          authoritiesNotifiedAt: new Date(),
          incidentNumber: `INC-${Date.now()}`,
        }
      })

      // TODO: Implement actual authorities notification
      console.log(`Authorities notified for alert ${alertId}`)
    } catch (error) {
      console.error('Error notifying authorities:', error)
    }
  }

  private static async notifyTripShare(tripShareId: string) {
    try {
      // TODO: Implement actual trip share notification (SMS, email)
      console.log(`Trip share notification sent for ${tripShareId}`)
    } catch (error) {
      console.error('Error notifying trip share:', error)
    }
  }
}
