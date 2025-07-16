
// Message queue service for reliable message delivery
import { prisma } from '@/lib/db'
import { MessageQueue } from '@/lib/types'

export class MessageQueueService {
  
  // Static methods for API routes
  static async addMessage(
    type: string,
    payload: any,
    priority: 'low' | 'medium' | 'high' = 'medium',
    delaySeconds: number = 0
  ) {
    try {
      const processAt = new Date(Date.now() + delaySeconds * 1000)
      
      const message = await prisma.messageQueue.create({
        data: {
          type,
          payload,
          priority,
          processAt,
          status: 'pending',
          retryCount: 0,
          maxRetries: 3
        }
      })
      
      return message
    } catch (error) {
      console.error('Error adding message to queue:', error)
      throw error
    }
  }

  static async getMessages(status?: string, type?: string) {
    try {
      const messages = await prisma.messageQueue.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(type ? { type } : {})
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100
      })
      
      return messages
    } catch (error) {
      console.error('Error getting messages:', error)
      throw error
    }
  }
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startProcessing()
  }

  // Enqueue message
  async enqueue(
    queueName: string,
    messageType: string,
    payload: any,
    options: {
      priority?: number
      processAt?: Date
      maxRetries?: number
      metadata?: any
    } = {}
  ): Promise<void> {
    try {
      const {
        priority = 0,
        processAt = new Date(),
        maxRetries = 3,
        metadata = {}
      } = options

      await prisma.messageQueue.create({
        data: {
          queueName,
          messageType,
          payload,
          priority,
          processAt,
          maxRetries,
          metadata
        }
      })
    } catch (error) {
      console.error('Error enqueueing message:', error)
      throw error
    }
  }

  // Process queue
  async processQueue(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true

    try {
      // Get pending messages
      const messages = await prisma.messageQueue.findMany({
        where: {
          status: 'PENDING',
          processAt: { lte: new Date() }
        },
        orderBy: [
          { priority: 'desc' },
          { processAt: 'asc' }
        ],
        take: 100
      })

      // Process messages
      for (const message of messages) {
        await this.processMessage(message)
      }

      // Retry failed messages
      await this.retryFailedMessages()

    } catch (error) {
      console.error('Error processing queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  // Process individual message
  private async processMessage(message: any): Promise<void> {
    try {
      // Mark as processing
      await prisma.messageQueue.update({
        where: { id: message.id },
        data: {
          status: 'PROCESSING',
          processedAt: new Date()
        }
      })

      // Process based on message type
      await this.handleMessageType(message)

      // Mark as completed
      await prisma.messageQueue.update({
        where: { id: message.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      })

    } catch (error) {
      console.error('Error processing message:', error)

      // Mark as failed
      await prisma.messageQueue.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: { stack: error instanceof Error ? error.stack : undefined }
        }
      })
    }
  }

  // Handle different message types
  private async handleMessageType(message: any): Promise<void> {
    const { messageType, payload } = message

    switch (messageType) {
      case 'push_notification':
        await this.handlePushNotification(payload)
        break
      case 'email_notification':
        await this.handleEmailNotification(payload)
        break
      case 'sms_notification':
        await this.handleSmsNotification(payload)
        break
      case 'order_update':
        await this.handleOrderUpdate(payload)
        break
      case 'ride_update':
        await this.handleRideUpdate(payload)
        break
      case 'inventory_update':
        await this.handleInventoryUpdate(payload)
        break
      case 'pricing_update':
        await this.handlePricingUpdate(payload)
        break
      case 'scheduled_notification':
        await this.handleScheduledNotification(payload)
        break
      default:
        console.warn(`Unknown message type: ${messageType}`)
    }
  }

  // Handle push notification
  private async handlePushNotification(payload: any): Promise<void> {
    const { PushNotificationService } = await import('./push-notification-service')
    const pushService = new PushNotificationService()
    await pushService.sendNotification(payload)
  }

  // Handle email notification
  private async handleEmailNotification(payload: any): Promise<void> {
    const { EmailNotificationService } = await import('./email-notification-service')
    const emailService = new EmailNotificationService()
    await emailService.sendNotification(payload)
  }

  // Handle SMS notification
  private async handleSmsNotification(payload: any): Promise<void> {
    const { SmsNotificationService } = await import('./sms-notification-service')
    const smsService = new SmsNotificationService()
    await smsService.sendNotification(payload)
  }

  // Handle order update
  private async handleOrderUpdate(payload: any): Promise<void> {
    const { orderId, status, updates } = payload

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...updates,
        updatedAt: new Date()
      }
    })

    // Create order status update record
    await prisma.orderStatusUpdate.create({
      data: {
        orderId,
        newStatus: status,
        source: 'system',
        broadcast: true,
        broadcastAt: new Date()
      }
    })

    // Send notifications
    const { NotificationOrchestrator } = await import('./notification-orchestrator')
    const orchestrator = new NotificationOrchestrator()
    await orchestrator.sendOrderNotification(orderId, status)
  }

  // Handle ride update
  private async handleRideUpdate(payload: any): Promise<void> {
    const { rideId, status, updates } = payload

    // Update ride status
    await prisma.ride.update({
      where: { id: rideId },
      data: {
        status,
        ...updates,
        updatedAt: new Date()
      }
    })

    // Send notifications
    const { NotificationOrchestrator } = await import('./notification-orchestrator')
    const orchestrator = new NotificationOrchestrator()
    await orchestrator.sendRideNotification(rideId, status)
  }

  // Handle inventory update
  private async handleInventoryUpdate(payload: any): Promise<void> {
    const { productId, newStock, changeType, orderId } = payload

    // Get current stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true, vendorId: true }
    })

    if (!product) return

    const previousStock = product.stockQuantity || 0
    const changeAmount = newStock - previousStock

    // Update product stock
    await prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: newStock }
    })

    // Create inventory update record
    await prisma.inventoryUpdate.create({
      data: {
        productId,
        vendorId: product.vendorId,
        previousStock,
        newStock,
        changeAmount,
        changeType,
        orderId,
        source: 'system',
        broadcast: true,
        broadcastAt: new Date()
      }
    })

    // Broadcast real-time update
    const { webSocketService } = await import('./comprehensive-websocket-service')
    webSocketService.emitToRoom(`vendor:${product.vendorId}`, 'inventory_update', {
      productId,
      previousStock,
      newStock,
      changeAmount,
      changeType
    })
  }

  // Handle pricing update
  private async handlePricingUpdate(payload: any): Promise<void> {
    const { productId, newPrice, reason } = payload

    // Get current price
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { price: true, vendorId: true }
    })

    if (!product) return

    const previousPrice = product.price
    const changeAmount = newPrice - previousPrice
    const changePercent = (changeAmount / previousPrice) * 100

    // Update product price
    await prisma.product.update({
      where: { id: productId },
      data: { price: newPrice }
    })

    // Create pricing update record
    await prisma.pricingUpdate.create({
      data: {
        productId,
        vendorId: product.vendorId,
        previousPrice,
        newPrice,
        changeAmount,
        changePercent,
        reason,
        source: 'system',
        broadcast: true,
        broadcastAt: new Date()
      }
    })

    // Broadcast real-time update
    const { webSocketService } = await import('./comprehensive-websocket-service')
    webSocketService.emitToRoom(`vendor:${product.vendorId}`, 'pricing_update', {
      productId,
      previousPrice,
      newPrice,
      changeAmount,
      changePercent,
      reason
    })
  }

  // Handle scheduled notification
  private async handleScheduledNotification(payload: any): Promise<void> {
    const { NotificationOrchestrator } = await import('./notification-orchestrator')
    const orchestrator = new NotificationOrchestrator()
    await orchestrator.sendNotification(payload)
  }

  // Retry failed messages
  private async retryFailedMessages(): Promise<void> {
    try {
      const failedMessages = await prisma.messageQueue.findMany({
        where: {
          status: 'FAILED',
          retryCount: { lt: prisma.messageQueue.fields.maxRetries }
        },
        orderBy: { failedAt: 'asc' },
        take: 50
      })

      for (const message of failedMessages) {
        // Calculate retry delay (exponential backoff)
        const retryDelay = Math.pow(2, message.retryCount) * 1000 // 1s, 2s, 4s, 8s...
        const nextRetryAt = new Date(Date.now() + retryDelay)

        await prisma.messageQueue.update({
          where: { id: message.id },
          data: {
            status: 'PENDING',
            retryCount: message.retryCount + 1,
            processAt: nextRetryAt
          }
        })
      }
    } catch (error) {
      console.error('Error retrying failed messages:', error)
    }
  }

  // Start processing
  private startProcessing(): void {
    // Process queue every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue()
    }, 5000)
  }

  // Stop processing
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
  }

  // Get queue statistics
  async getQueueStats(): Promise<any> {
    try {
      const stats = await prisma.messageQueue.groupBy({
        by: ['queueName', 'status'],
        _count: { id: true }
      })

      const result: any = {}

      for (const stat of stats) {
        if (!result[stat.queueName]) {
          result[stat.queueName] = {}
        }
        result[stat.queueName][stat.status] = stat._count.id
      }

      return result
    } catch (error) {
      console.error('Error getting queue stats:', error)
      return {}
    }
  }

  // Clean up old completed messages
  async cleanupCompletedMessages(daysOld: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const result = await prisma.messageQueue.deleteMany({
        where: {
          status: 'COMPLETED',
          completedAt: { lt: cutoffDate }
        }
      })

      console.log(`Cleaned up ${result.count} completed messages`)
    } catch (error) {
      console.error('Error cleaning up completed messages:', error)
    }
  }
}

