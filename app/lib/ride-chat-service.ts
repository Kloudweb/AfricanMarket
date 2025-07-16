
import { prisma } from '@/lib/db'
import { MessageType } from './types'

export class RideChatService {
  // Send a message in ride chat
  static async sendMessage(data: {
    rideId: string
    senderId: string
    receiverId: string
    message?: string
    messageType: MessageType
    attachmentUrl?: string
    thumbnailUrl?: string
    voiceDuration?: number
    locationLat?: number
    locationLng?: number
    locationAddress?: string
    quickReplyId?: string
  }) {
    try {
      const chatMessage = await prisma.rideChat.create({
        data: {
          rideId: data.rideId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          message: data.message,
          messageType: data.messageType,
          attachmentUrl: data.attachmentUrl,
          thumbnailUrl: data.thumbnailUrl,
          voiceDuration: data.voiceDuration,
          locationLat: data.locationLat,
          locationLng: data.locationLng,
          locationAddress: data.locationAddress,
          quickReplyId: data.quickReplyId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            }
          }
        }
      })

      return chatMessage
    } catch (error) {
      console.error('Error sending ride chat message:', error)
      throw error
    }
  }

  // Get chat messages for a ride
  static async getChatMessages(rideId: string, userId: string, limit: number = 50, offset: number = 0) {
    try {
      // First, verify that the user has access to this ride
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
        throw new Error('Unauthorized access to ride chat')
      }

      const messages = await prisma.rideChat.findMany({
        where: {
          rideId: rideId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit,
      })

      return messages.reverse() // Return in chronological order
    } catch (error) {
      console.error('Error fetching ride chat messages:', error)
      throw error
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(rideId: string, userId: string) {
    try {
      await prisma.rideChat.updateMany({
        where: {
          rideId: rideId,
          receiverId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error marking messages as read:', error)
      throw error
    }
  }

  // Get unread message count
  static async getUnreadCount(rideId: string, userId: string) {
    try {
      const count = await prisma.rideChat.count({
        where: {
          rideId: rideId,
          receiverId: userId,
          isRead: false,
        }
      })

      return count
    } catch (error) {
      console.error('Error getting unread count:', error)
      throw error
    }
  }

  // Delete a message
  static async deleteMessage(messageId: string, userId: string) {
    try {
      const message = await prisma.rideChat.findFirst({
        where: {
          id: messageId,
          senderId: userId,
        }
      })

      if (!message) {
        throw new Error('Message not found or unauthorized')
      }

      await prisma.rideChat.delete({
        where: {
          id: messageId,
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error deleting message:', error)
      throw error
    }
  }

  // Get quick reply templates
  static getQuickReplyTemplates() {
    return [
      { id: 'arrive_5min', text: "I'll be there in 5 minutes" },
      { id: 'arrive_10min', text: "I'll be there in 10 minutes" },
      { id: 'waiting', text: "I'm waiting for you" },
      { id: 'here', text: "I'm here" },
      { id: 'parking', text: "Looking for parking" },
      { id: 'traffic', text: "Stuck in traffic" },
      { id: 'thanks', text: "Thank you!" },
      { id: 'help', text: "I need help finding you" },
      { id: 'cancel', text: "I need to cancel" },
      { id: 'delayed', text: "Running a bit late" },
    ]
  }

  // Auto-translate message
  static async translateMessage(messageId: string, targetLanguage: string) {
    try {
      const message = await prisma.rideChat.findUnique({
        where: { id: messageId }
      })

      if (!message || !message.message) {
        throw new Error('Message not found')
      }

      // TODO: Implement actual translation using a translation service
      // For now, we'll just return a placeholder
      const translatedMessage = `[Translated to ${targetLanguage}]: ${message.message}`

      await prisma.rideChat.update({
        where: { id: messageId },
        data: {
          translatedMessage: translatedMessage,
          translatedLanguage: targetLanguage,
        }
      })

      return { translatedMessage, targetLanguage }
    } catch (error) {
      console.error('Error translating message:', error)
      throw error
    }
  }

  // Get chat analytics
  static async getChatAnalytics(rideId: string) {
    try {
      const analytics = await prisma.rideChat.aggregate({
        where: { rideId },
        _count: {
          _all: true,
        },
      })

      const messageTypes = await prisma.rideChat.groupBy({
        by: ['messageType'],
        where: { rideId },
        _count: {
          _all: true,
        },
      })

      const responseTime = await prisma.rideChat.findMany({
        where: { rideId },
        orderBy: { createdAt: 'asc' },
        take: 10,
      })

      return {
        totalMessages: analytics._count._all,
        messageTypes: messageTypes.map(type => ({
          type: type.messageType,
          count: type._count._all,
        })),
        averageResponseTime: this.calculateAverageResponseTime(responseTime),
      }
    } catch (error) {
      console.error('Error getting chat analytics:', error)
      throw error
    }
  }

  private static calculateAverageResponseTime(messages: any[]) {
    if (messages.length < 2) return 0

    let totalTime = 0
    let responseCount = 0

    for (let i = 1; i < messages.length; i++) {
      const currentMessage = messages[i]
      const previousMessage = messages[i - 1]

      if (currentMessage.senderId !== previousMessage.senderId) {
        const timeDiff = new Date(currentMessage.createdAt).getTime() - new Date(previousMessage.createdAt).getTime()
        totalTime += timeDiff
        responseCount++
      }
    }

    return responseCount > 0 ? Math.round(totalTime / responseCount / 1000) : 0 // Return in seconds
  }
}
