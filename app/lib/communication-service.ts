
import { prisma } from '@/lib/db'
import { CallType, CallStatus } from './types'

export class CommunicationService {
  // Initiate a call
  static async initiateCall(data: {
    rideId: string
    callerId: string
    calleeId: string
    callType: CallType
  }) {
    try {
      const call = await prisma.rideCall.create({
        data: {
          rideId: data.rideId,
          callerId: data.callerId,
          calleeId: data.calleeId,
          callType: data.callType,
          status: 'INITIATED',
        },
        include: {
          caller: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            }
          },
          callee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            }
          }
        }
      })

      return call
    } catch (error) {
      console.error('Error initiating call:', error)
      throw error
    }
  }

  // Update call status
  static async updateCallStatus(callId: string, status: CallStatus, userId: string) {
    try {
      const updateData: any = { status }

      if (status === 'ANSWERED') {
        updateData.answeredAt = new Date()
      } else if (status === 'ENDED') {
        updateData.endedAt = new Date()
      }

      const call = await prisma.rideCall.update({
        where: { id: callId },
        data: updateData,
        include: {
          caller: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            }
          },
          callee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            }
          }
        }
      })

      // Calculate duration if call ended
      if (status === 'ENDED' && call.answeredAt) {
        const duration = Math.floor((new Date().getTime() - new Date(call.answeredAt).getTime()) / 1000)
        await prisma.rideCall.update({
          where: { id: callId },
          data: { duration }
        })
      }

      return call
    } catch (error) {
      console.error('Error updating call status:', error)
      throw error
    }
  }

  // Get call history for a ride
  static async getCallHistory(rideId: string, userId: string) {
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

      const calls = await prisma.rideCall.findMany({
        where: { rideId },
        include: {
          caller: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            }
          },
          callee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      })

      return calls
    } catch (error) {
      console.error('Error getting call history:', error)
      throw error
    }
  }

  // Get or create communication preferences
  static async getCommunicationPreferences(userId: string) {
    try {
      let preferences = await prisma.communicationPreference.findUnique({
        where: { userId }
      })

      if (!preferences) {
        preferences = await prisma.communicationPreference.create({
          data: {
            userId,
            preferredMethod: 'CHAT',
            allowVoiceCalls: true,
            allowVideoCalls: false,
            primaryLanguage: 'en',
            enableTranslation: true,
            autoTranslate: false,
            enableChatNotifications: true,
            enableCallNotifications: true,
            enablePushToTalk: false,
            dndEnabled: false,
            enableVoiceAssist: false,
            enableTextToSpeech: false,
            enableSpeechToText: false,
          }
        })
      }

      return preferences
    } catch (error) {
      console.error('Error getting communication preferences:', error)
      throw error
    }
  }

  // Update communication preferences
  static async updateCommunicationPreferences(userId: string, updates: {
    preferredMethod?: string
    allowVoiceCalls?: boolean
    allowVideoCalls?: boolean
    primaryLanguage?: string
    enableTranslation?: boolean
    autoTranslate?: boolean
    enableChatNotifications?: boolean
    enableCallNotifications?: boolean
    enablePushToTalk?: boolean
    dndEnabled?: boolean
    dndStartTime?: string
    dndEndTime?: string
    enableVoiceAssist?: boolean
    enableTextToSpeech?: boolean
    enableSpeechToText?: boolean
  }) {
    try {
      const preferences = await prisma.communicationPreference.upsert({
        where: { userId },
        create: {
          userId,
          ...updates,
        },
        update: updates,
      })

      return preferences
    } catch (error) {
      console.error('Error updating communication preferences:', error)
      throw error
    }
  }

  // Check if user is available for communication
  static async isUserAvailable(userId: string) {
    try {
      const preferences = await this.getCommunicationPreferences(userId)
      
      if (!preferences.dndEnabled) {
        return true
      }

      if (preferences.dndStartTime && preferences.dndEndTime) {
        const now = new Date()
        const currentTime = now.getHours() * 60 + now.getMinutes()
        
        const [startHour, startMinute] = preferences.dndStartTime.split(':').map(Number)
        const [endHour, endMinute] = preferences.dndEndTime.split(':').map(Number)
        
        const startTime = startHour * 60 + startMinute
        const endTime = endHour * 60 + endMinute
        
        if (startTime <= endTime) {
          // Same day DND
          return !(currentTime >= startTime && currentTime <= endTime)
        } else {
          // Overnight DND
          return !(currentTime >= startTime || currentTime <= endTime)
        }
      }

      return true
    } catch (error) {
      console.error('Error checking user availability:', error)
      return true // Default to available if error
    }
  }

  // Get supported languages
  static getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'Français' },
      { code: 'es', name: 'Español' },
      { code: 'de', name: 'Deutsch' },
      { code: 'it', name: 'Italiano' },
      { code: 'pt', name: 'Português' },
      { code: 'ar', name: 'العربية' },
      { code: 'zh', name: '中文' },
      { code: 'hi', name: 'हिन्दी' },
      { code: 'ja', name: '日本語' },
      { code: 'ko', name: '한국어' },
      { code: 'ru', name: 'Русский' },
    ]
  }

  // Get communication statistics
  static async getCommunicationStats(rideId: string) {
    try {
      const chatStats = await prisma.rideChat.aggregate({
        where: { rideId },
        _count: { _all: true },
      })

      const callStats = await prisma.rideCall.aggregate({
        where: { rideId },
        _count: { _all: true },
        _sum: { duration: true },
      })

      const callsByStatus = await prisma.rideCall.groupBy({
        by: ['status'],
        where: { rideId },
        _count: { _all: true },
      })

      const messagesByType = await prisma.rideChat.groupBy({
        by: ['messageType'],
        where: { rideId },
        _count: { _all: true },
      })

      return {
        totalMessages: chatStats._count._all,
        totalCalls: callStats._count._all,
        totalCallDuration: callStats._sum.duration || 0,
        callsByStatus: callsByStatus.map(stat => ({
          status: stat.status,
          count: stat._count._all,
        })),
        messagesByType: messagesByType.map(stat => ({
          type: stat.messageType,
          count: stat._count._all,
        })),
      }
    } catch (error) {
      console.error('Error getting communication stats:', error)
      throw error
    }
  }
}
