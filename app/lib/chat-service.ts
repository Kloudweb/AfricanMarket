
// Real-time chat service
import { prisma } from '@/lib/db'
import { ComprehensiveWebSocketService } from './comprehensive-websocket-service'

export class ChatService {
  
  // Static methods for API routes
  static async createRoom(
    creatorId: string,
    name: string,
    description?: string,
    isGroup: boolean = false,
    participantIds: string[] = []
  ) {
    try {
      const room = await prisma.chatRoom.create({
        data: {
          name,
          description,
          isGroup,
          creatorId,
          participants: {
            connect: participantIds.map(id => ({ id }))
          }
        },
        include: {
          participants: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      })
      return room
    } catch (error) {
      console.error('Error creating chat room:', error)
      throw error
    }
  }

  static async getUserRooms(userId: string, page: number = 1, limit: number = 20) {
    try {
      const rooms = await prisma.chatRoom.findMany({
        where: {
          participants: {
            some: {
              id: userId
            }
          }
        },
        include: {
          participants: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          messages: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      })
      return rooms
    } catch (error) {
      console.error('Error getting user rooms:', error)
      throw error
    }
  }

  static async sendMessage(
    roomId: string,
    senderId: string,
    content: string,
    type: string = 'text',
    metadata?: any
  ) {
    try {
      const message = await prisma.chatRoomMessage.create({
        data: {
          roomId,
          senderId,
          message: content,
          messageType: type,
          data: metadata || {}
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      })

      // Broadcast to room participants
      ComprehensiveWebSocketService.sendToRoom(roomId, 'new_message', message)
      
      return message
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  static async getMessages(
    roomId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ) {
    try {
      const messages = await prisma.chatRoomMessage.findMany({
        where: {
          roomId,
          room: {
            participants: {
              some: {
                id: userId
              }
            }
          }
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      })
      return messages.reverse()
    } catch (error) {
      console.error('Error getting messages:', error)
      throw error
    }
  }

  static async markMessagesAsRead(
    roomId: string,
    userId: string,
    messageIds: string[]
  ) {
    try {
      const result = await prisma.chatRoomMessage.updateMany({
        where: {
          id: {
            in: messageIds
          },
          roomId,
          senderId: {
            not: userId
          }
        },
        data: {
          readAt: new Date()
        }
      })
      return result
    } catch (error) {
      console.error('Error marking messages as read:', error)
      throw error
    }
  }

  static async getUnreadMessagesCount(roomId: string, userId: string) {
    try {
      const count = await prisma.chatRoomMessage.count({
        where: {
          roomId,
          senderId: {
            not: userId
          },
          readAt: null
        }
      })
      return count
    } catch (error) {
      console.error('Error getting unread messages count:', error)
      throw error
    }
  }
  // Handle chat message
  async handleMessage(socket: any, data: any): Promise<void> {
    try {
      const { roomId, message, messageType = 'text', mediaUrl, replyToId } = data

      // Validate room access
      const canAccess = await this.canUserAccessRoom(socket.userId, roomId)
      if (!canAccess) {
        socket.emit('chat_error', { message: 'Access denied to chat room' })
        return
      }

      // Create chat message
      const chatMessage = await prisma.chatRoomMessage.create({
        data: {
          roomId,
          senderId: socket.userId,
          message,
          messageType,
          mediaUrl,
          replyToId,
          data: data.data || {}
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          replyTo: {
            select: {
              id: true,
              message: true,
              sender: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })

      // Update room message count
      await prisma.chatRoom.update({
        where: { id: roomId },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date()
        }
      })

      // Broadcast to room
      ComprehensiveWebSocketService.sendToRoom(roomId, 'new_message', {
        id: chatMessage.id,
        roomId,
        senderId: socket.userId,
        senderName: chatMessage.sender.name,
        senderAvatar: chatMessage.sender.avatar,
        message,
        messageType,
        mediaUrl,
        replyToId,
        replyTo: chatMessage.replyTo,
        data: chatMessage.data,
        createdAt: chatMessage.createdAt
      })

      // Send notification to offline users
      await this.notifyOfflineUsers(roomId, chatMessage)

    } catch (error) {
      console.error('Error handling chat message:', error)
      socket.emit('chat_error', { message: 'Failed to send message' })
    }
  }

  // Handle message read
  async handleMessageRead(socket: any, data: { messageId: string }): Promise<void> {
    try {
      const { messageId } = data

      // Update message read status
      await prisma.chatRoomMessage.updateMany({
        where: {
          id: messageId,
          senderId: { not: socket.userId }
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      // Get message details
      const message = await prisma.chatRoomMessage.findUnique({
        where: { id: messageId },
        select: { roomId: true, senderId: true }
      })

      if (message) {
        // Notify sender
        ComprehensiveWebSocketService.sendToUser(message.senderId, 'message_read', {
          messageId,
          readBy: socket.userId,
          readAt: new Date()
        })
      }

    } catch (error) {
      console.error('Error handling message read:', error)
    }
  }

  // Create chat room
  async createChatRoom(data: {
    type: string
    participants: string[]
    name?: string
    orderId?: string
    rideId?: string
    vendorId?: string
    driverId?: string
  }): Promise<any> {
    try {
      const room = await prisma.chatRoom.create({
        data: {
          type: data.type,
          participants: data.participants,
          name: data.name,
          orderId: data.orderId,
          rideId: data.rideId,
          vendorId: data.vendorId,
          driverId: data.driverId,
          isActive: true,
          isPrivate: true,
          allowMessages: true,
          allowMedia: true
        }
      })

      // Add participants to room
      for (const userId of data.participants) {
        if (ComprehensiveWebSocketService.isUserOnline(userId)) {
          ComprehensiveWebSocketService.sendToUser(userId, 'room_created', {
            roomId: room.id,
            type: room.type,
            name: room.name,
            participants: room.participants
          })
        }
      }

      return room
    } catch (error) {
      console.error('Error creating chat room:', error)
      throw error
    }
  }

  // Get chat room messages
  async getRoomMessages(roomId: string, userId: string, options: {
    limit?: number
    offset?: number
    before?: Date
  } = {}): Promise<any[]> {
    try {
      // Check access
      const canAccess = await this.canUserAccessRoom(userId, roomId)
      if (!canAccess) {
        throw new Error('Access denied to chat room')
      }

      const { limit = 50, offset = 0, before } = options

      const where: any = { roomId }
      if (before) {
        where.createdAt = { lt: before }
      }

      return await prisma.chatRoomMessage.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          replyTo: {
            select: {
              id: true,
              message: true,
              sender: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      })
    } catch (error) {
      console.error('Error getting room messages:', error)
      return []
    }
  }

  // Get user chat rooms
  async getUserChatRooms(userId: string): Promise<any[]> {
    try {
      return await prisma.chatRoom.findMany({
        where: {
          participants: {
            has: userId
          },
          isActive: true
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            }
          }
        },
        orderBy: { lastMessageAt: 'desc' }
      })
    } catch (error) {
      console.error('Error getting user chat rooms:', error)
      return []
    }
  }

  // Create order chat room
  async createOrderChatRoom(orderId: string): Promise<any> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: true,
          driver: true
        }
      })

      if (!order) {
        throw new Error('Order not found')
      }

      const participants = [order.customerId, order.vendor.userId]
      if (order.driverId) {
        participants.push(order.driver!.userId)
      }

      return await this.createChatRoom({
        type: 'order',
        participants,
        name: `Order #${order.orderNumber}`,
        orderId: order.id,
        vendorId: order.vendorId,
        driverId: order.driverId
      })
    } catch (error) {
      console.error('Error creating order chat room:', error)
      throw error
    }
  }

  // Create ride chat room
  async createRideChatRoom(rideId: string): Promise<any> {
    try {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          customer: true,
          driver: {
            include: {
              user: true
            }
          }
        }
      })

      if (!ride) {
        throw new Error('Ride not found')
      }

      const participants = [ride.customerId]
      if (ride.driverId) {
        participants.push(ride.driver!.userId)
      }

      return await this.createChatRoom({
        type: 'ride',
        participants,
        name: `Ride #${ride.rideNumber}`,
        rideId: ride.id,
        driverId: ride.driverId
      })
    } catch (error) {
      console.error('Error creating ride chat room:', error)
      throw error
    }
  }

  // Check if user can access room
  private async canUserAccessRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { participants: true, isActive: true }
      })

      return room?.isActive && room.participants.includes(userId)
    } catch (error) {
      console.error('Error checking room access:', error)
      return false
    }
  }

  // Notify offline users
  private async notifyOfflineUsers(roomId: string, message: any): Promise<void> {
    try {
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { participants: true }
      })

      if (!room) return

      const { InAppNotificationService } = await import('./in-app-notification-service')
      const notificationService = new InAppNotificationService()

      for (const userId of room.participants) {
        if (userId !== message.senderId && !ComprehensiveWebSocketService.isUserOnline(userId)) {
          await notificationService.sendNotification({
            userId,
            title: 'New Message',
            body: `${message.sender.name}: ${message.message}`,
            type: 'chat',
            data: {
              roomId,
              messageId: message.id,
              senderId: message.senderId
            }
          })
        }
      }
    } catch (error) {
      console.error('Error notifying offline users:', error)
    }
  }

  // Delete message
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const message = await prisma.chatRoomMessage.findUnique({
        where: { id: messageId },
        select: { senderId: true, roomId: true }
      })

      if (!message || message.senderId !== userId) {
        throw new Error('Cannot delete message')
      }

      await prisma.chatRoomMessage.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          message: 'This message was deleted'
        }
      })

      // Broadcast deletion
      ComprehensiveWebSocketService.sendToRoom(message.roomId, 'message_deleted', {
        messageId,
        deletedBy: userId,
        deletedAt: new Date()
      })
    } catch (error) {
      console.error('Error deleting message:', error)
      throw error
    }
  }

  // Edit message
  async editMessage(messageId: string, userId: string, newMessage: string): Promise<void> {
    try {
      const message = await prisma.chatRoomMessage.findUnique({
        where: { id: messageId },
        select: { senderId: true, roomId: true }
      })

      if (!message || message.senderId !== userId) {
        throw new Error('Cannot edit message')
      }

      await prisma.chatRoomMessage.update({
        where: { id: messageId },
        data: {
          message: newMessage,
          isEdited: true,
          editedAt: new Date()
        }
      })

      // Broadcast edit
      ComprehensiveWebSocketService.sendToRoom(message.roomId, 'message_edited', {
        messageId,
        newMessage,
        editedBy: userId,
        editedAt: new Date()
      })
    } catch (error) {
      console.error('Error editing message:', error)
      throw error
    }
  }

  // Get unread message count
  async getUnreadMessageCount(userId: string, roomId?: string): Promise<number> {
    try {
      const where: any = {
        isRead: false,
        senderId: { not: userId }
      }

      if (roomId) {
        where.roomId = roomId
      } else {
        // Get user's rooms
        const userRooms = await prisma.chatRoom.findMany({
          where: {
            participants: { has: userId },
            isActive: true
          },
          select: { id: true }
        })

        where.roomId = { in: userRooms.map(r => r.id) }
      }

      return await prisma.chatRoomMessage.count({ where })
    } catch (error) {
      console.error('Error getting unread message count:', error)
      return 0
    }
  }

  // Mark room messages as read
  async markRoomMessagesAsRead(roomId: string, userId: string): Promise<void> {
    try {
      await prisma.chatRoomMessage.updateMany({
        where: {
          roomId,
          senderId: { not: userId },
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      // Broadcast read status
      ComprehensiveWebSocketService.sendToRoom(roomId, 'messages_read', {
        readBy: userId,
        readAt: new Date()
      })
    } catch (error) {
      console.error('Error marking room messages as read:', error)
      throw error
    }
  }
}

