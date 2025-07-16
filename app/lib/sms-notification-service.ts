
// Twilio SMS notification service
import { prisma } from '@/lib/db'
import { NotificationPayload, DeliveryStatus } from '@/lib/types'

export class SmsNotificationService {
  private twilioAccountSid: string
  private twilioAuthToken: string
  private twilioPhoneNumber: string
  private twilioApiUrl: string

  constructor() {
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || ''
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || ''
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || ''
    this.twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`

    if (!this.twilioAccountSid || !this.twilioAuthToken || !this.twilioPhoneNumber) {
      console.warn('Twilio credentials not found in environment variables')
    }
  }

  // Send SMS notification
  async sendNotification(payload: NotificationPayload): Promise<DeliveryStatus> {
    try {
      if (!this.twilioAccountSid || !this.twilioAuthToken || !this.twilioPhoneNumber) {
        throw new Error('Twilio not configured')
      }

      // Get user's phone number
      const user = await prisma.user.findUnique({
        where: { id: payload.userId! },
        select: { phone: true }
      })

      if (!user?.phone) {
        return {
          channel: 'sms',
          status: 'FAILED',
          failureReason: 'No phone number found',
          retryCount: 0
        }
      }

      // Format message
      const message = this.formatSmsMessage(payload)

      // Send SMS
      const response = await this.sendSms(user.phone, message)

      // Save to database
      await this.saveSmsNotificationToDatabase(payload, user.phone, message, response)

      return {
        channel: 'sms',
        status: 'DELIVERED',
        sentAt: new Date(),
        deliveredAt: new Date(),
        cost: response.price ? parseFloat(response.price) : undefined,
        retryCount: 0
      }

    } catch (error) {
      console.error('Error sending SMS notification:', error)
      
      return {
        channel: 'sms',
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0
      }
    }
  }

  // Send SMS via Twilio
  private async sendSms(to: string, message: string): Promise<any> {
    try {
      const formData = new URLSearchParams({
        From: this.twilioPhoneNumber,
        To: to,
        Body: message
      })

      const response = await fetch(this.twilioApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Twilio API error: ${error.message}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error sending SMS via Twilio:', error)
      throw error
    }
  }

  // Format SMS message
  private formatSmsMessage(payload: NotificationPayload): string {
    let message = `${payload.title}\n\n${payload.body}`

    // Add order/ride specific info
    if (payload.orderId) {
      message += `\n\nOrder ID: ${payload.orderId}`
    }
    
    if (payload.rideId) {
      message += `\n\nRide ID: ${payload.rideId}`
    }

    // Add app link
    message += '\n\nView details in the AfricanMarket app'

    return message
  }

  // Send verification SMS
  async sendVerificationSms(phoneNumber: string, code: string): Promise<void> {
    try {
      const message = `Your AfricanMarket verification code is: ${code}\n\nThis code will expire in 10 minutes.`
      
      const response = await this.sendSms(phoneNumber, message)
      
      await prisma.smsNotification.create({
        data: {
          phoneNumber,
          message,
          type: 'verification',
          status: 'SENT',
          sentAt: new Date(),
          messageId: response.sid,
          cost: response.price ? parseFloat(response.price) : undefined,
          segments: response.num_segments || 1
        }
      })
    } catch (error) {
      console.error('Error sending verification SMS:', error)
      throw error
    }
  }

  // Send emergency SMS
  async sendEmergencySms(phoneNumber: string, message: string, userId?: string): Promise<void> {
    try {
      const emergencyMessage = `🚨 EMERGENCY ALERT 🚨\n\n${message}\n\nThis is an automated message from AfricanMarket.`
      
      const response = await this.sendSms(phoneNumber, emergencyMessage)
      
      await prisma.smsNotification.create({
        data: {
          userId,
          phoneNumber,
          message: emergencyMessage,
          type: 'alert',
          status: 'SENT',
          sentAt: new Date(),
          messageId: response.sid,
          cost: response.price ? parseFloat(response.price) : undefined,
          segments: response.num_segments || 1
        }
      })
    } catch (error) {
      console.error('Error sending emergency SMS:', error)
      throw error
    }
  }

  // Send order update SMS
  async sendOrderUpdateSms(orderId: string, status: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: true
        }
      })

      if (!order || !order.customer.phone) {
        return
      }

      const statusMessages = {
        'CONFIRMED': 'Your order has been confirmed and is being prepared.',
        'READY_FOR_PICKUP': 'Your order is ready for pickup.',
        'OUT_FOR_DELIVERY': 'Your order is out for delivery.',
        'DELIVERED': 'Your order has been delivered.'
      }

      const message = statusMessages[status as keyof typeof statusMessages]
      if (!message) return

      const payload: NotificationPayload = {
        userId: order.customerId,
        title: 'Order Update',
        body: message,
        type: 'order',
        orderId: order.id,
        urgent: true
      }

      await this.sendNotification(payload)
    } catch (error) {
      console.error('Error sending order update SMS:', error)
      throw error
    }
  }

  // Save SMS notification to database
  private async saveSmsNotificationToDatabase(
    payload: NotificationPayload,
    phoneNumber: string,
    message: string,
    response: any
  ): Promise<void> {
    try {
      await prisma.smsNotification.create({
        data: {
          userId: payload.userId,
          phoneNumber,
          message,
          type: payload.type || 'notification',
          status: 'SENT',
          sentAt: new Date(),
          messageId: response.sid,
          cost: response.price ? parseFloat(response.price) : undefined,
          segments: response.num_segments || 1,
          orderId: payload.orderId,
          rideId: payload.rideId,
          vendorId: payload.vendorId,
          driverId: payload.driverId
        }
      })
    } catch (error) {
      console.error('Error saving SMS notification to database:', error)
    }
  }

  // Process SMS queue
  async processSmsQueue(): Promise<void> {
    try {
      const pendingMessages = await prisma.smsNotification.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { scheduleFor: { lte: new Date() } },
            { scheduleFor: null }
          ]
        },
        take: 50, // Limit to avoid rate limits
        orderBy: { createdAt: 'asc' }
      })

      for (const sms of pendingMessages) {
        await this.processQueuedSms(sms)
        
        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error('Error processing SMS queue:', error)
    }
  }

  // Process individual queued SMS
  private async processQueuedSms(sms: any): Promise<void> {
    try {
      const response = await this.sendSms(sms.phoneNumber, sms.message)
      
      await prisma.smsNotification.update({
        where: { id: sms.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: response.sid,
          cost: response.price ? parseFloat(response.price) : undefined,
          segments: response.num_segments || 1
        }
      })
    } catch (error) {
      console.error('Error processing queued SMS:', error)
      
      await prisma.smsNotification.update({
        where: { id: sms.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: error instanceof Error ? error.message : 'Unknown error',
          retryCount: sms.retryCount + 1
        }
      })
    }
  }

  // Get SMS delivery status
  async getSmsDeliveryStatus(messageId: string): Promise<string> {
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages/${messageId}.json`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64')}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get SMS status: ${response.status}`)
      }

      const data = await response.json()
      return data.status
    } catch (error) {
      console.error('Error getting SMS delivery status:', error)
      return 'unknown'
    }
  }

  // Update SMS delivery status
  async updateSmsDeliveryStatus(messageId: string): Promise<void> {
    try {
      const status = await this.getSmsDeliveryStatus(messageId)
      
      await prisma.smsNotification.updateMany({
        where: { messageId },
        data: {
          status: status.toUpperCase(),
          deliveredAt: status === 'delivered' ? new Date() : undefined,
          failedAt: status === 'failed' ? new Date() : undefined
        }
      })
    } catch (error) {
      console.error('Error updating SMS delivery status:', error)
    }
  }

  // Get SMS analytics
  async getSmsAnalytics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const stats = await prisma.smsNotification.groupBy({
        by: ['status', 'type'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        },
        _sum: {
          cost: true,
          segments: true
        }
      })

      return {
        totalMessages: stats.reduce((sum, stat) => sum + stat._count.id, 0),
        totalCost: stats.reduce((sum, stat) => sum + (stat._sum.cost || 0), 0),
        totalSegments: stats.reduce((sum, stat) => sum + (stat._sum.segments || 0), 0),
        breakdown: stats
      }
    } catch (error) {
      console.error('Error getting SMS analytics:', error)
      return null
    }
  }
}

