
// Comprehensive email notification service
import { prisma } from '@/lib/db'
import { NotificationPayload, DeliveryStatus } from '@/lib/types'

export class EmailNotificationService {
  private smtpConfig: {
    host: string
    port: number
    secure: boolean
    auth: {
      user: string
      pass: string
    }
  }

  constructor() {
    this.smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    }

    if (!this.smtpConfig.auth.user || !this.smtpConfig.auth.pass) {
      console.warn('SMTP credentials not found in environment variables')
    }
  }

  // Send email notification
  async sendNotification(payload: NotificationPayload): Promise<DeliveryStatus> {
    try {
      // Get user's email
      const user = await prisma.user.findUnique({
        where: { id: payload.userId! },
        select: { email: true, name: true }
      })

      if (!user?.email) {
        return {
          channel: 'email',
          status: 'FAILED',
          failureReason: 'No email address found',
          retryCount: 0
        }
      }

      // Generate email content
      const emailContent = await this.generateEmailContent(payload, user)

      // Send email
      await this.sendEmail(user.email, emailContent)

      // Save to database
      await this.saveEmailNotificationToDatabase(payload, user.email, emailContent)

      return {
        channel: 'email',
        status: 'SENT',
        sentAt: new Date(),
        retryCount: 0
      }

    } catch (error) {
      console.error('Error sending email notification:', error)
      
      return {
        channel: 'email',
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0
      }
    }
  }

  // Send email
  private async sendEmail(to: string, content: { subject: string; html: string; text: string }): Promise<void> {
    try {
      // For now, we'll use a simple fetch to a mock SMTP service
      // In production, you would use nodemailer or similar
      const emailData = {
        from: `AfricanMarket <${this.smtpConfig.auth.user}>`,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text
      }

      console.log('Email would be sent:', emailData)
      
      // Mock sending - in production, implement actual SMTP sending
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.error('Error sending email:', error)
      throw error
    }
  }

  // Generate email content
  private async generateEmailContent(payload: NotificationPayload, user: any): Promise<{
    subject: string
    html: string
    text: string
  }> {
    const subject = payload.title
    const userName = user.name || 'Valued Customer'

    // Get template based on notification type
    const template = this.getEmailTemplate(payload.type)
    
    const html = template.html
      .replace('{{userName}}', userName)
      .replace('{{title}}', payload.title)
      .replace('{{body}}', payload.body)
      .replace('{{orderId}}', payload.orderId || '')
      .replace('{{rideId}}', payload.rideId || '')
      .replace('{{appUrl}}', process.env.NEXT_PUBLIC_APP_URL || 'https://africanmarket.app')

    const text = template.text
      .replace('{{userName}}', userName)
      .replace('{{title}}', payload.title)
      .replace('{{body}}', payload.body)
      .replace('{{orderId}}', payload.orderId || '')
      .replace('{{rideId}}', payload.rideId || '')

    return { subject, html, text }
  }

  // Get email template
  private getEmailTemplate(type: string): { html: string; text: string } {
    const templates = {
      order: {
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>{{title}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #FF6B35; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .button { display: inline-block; padding: 10px 20px; background: #FF6B35; color: white; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>AfricanMarket</h1>
              </div>
              <div class="content">
                <h2>Hello {{userName}},</h2>
                <p>{{body}}</p>
                {{#if orderId}}
                <p><strong>Order ID:</strong> {{orderId}}</p>
                {{/if}}
                <p><a href="{{appUrl}}" class="button">View in App</a></p>
              </div>
              <div class="footer">
                <p>This is an automated message from AfricanMarket.</p>
                <p>Visit us at {{appUrl}}</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Hello {{userName}},

          {{body}}

          {{#if orderId}}
          Order ID: {{orderId}}
          {{/if}}

          View more details in the AfricanMarket app.

          Best regards,
          AfricanMarket Team
        `
      },
      ride: {
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>{{title}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .button { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>AfricanMarket Rides</h1>
              </div>
              <div class="content">
                <h2>Hello {{userName}},</h2>
                <p>{{body}}</p>
                {{#if rideId}}
                <p><strong>Ride ID:</strong> {{rideId}}</p>
                {{/if}}
                <p><a href="{{appUrl}}" class="button">View in App</a></p>
              </div>
              <div class="footer">
                <p>This is an automated message from AfricanMarket.</p>
                <p>Visit us at {{appUrl}}</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Hello {{userName}},

          {{body}}

          {{#if rideId}}
          Ride ID: {{rideId}}
          {{/if}}

          View more details in the AfricanMarket app.

          Best regards,
          AfricanMarket Team
        `
      },
      payment: {
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>{{title}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .button { display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>AfricanMarket Payments</h1>
              </div>
              <div class="content">
                <h2>Hello {{userName}},</h2>
                <p>{{body}}</p>
                <p><a href="{{appUrl}}" class="button">View in App</a></p>
              </div>
              <div class="footer">
                <p>This is an automated message from AfricanMarket.</p>
                <p>Visit us at {{appUrl}}</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Hello {{userName}},

          {{body}}

          View more details in the AfricanMarket app.

          Best regards,
          AfricanMarket Team
        `
      },
      marketing: {
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>{{title}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #9C27B0; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .button { display: inline-block; padding: 10px 20px; background: #9C27B0; color: white; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>AfricanMarket</h1>
              </div>
              <div class="content">
                <h2>Hello {{userName}},</h2>
                <p>{{body}}</p>
                <p><a href="{{appUrl}}" class="button">Explore Now</a></p>
              </div>
              <div class="footer">
                <p>This is a promotional message from AfricanMarket.</p>
                <p><a href="{{appUrl}}/unsubscribe">Unsubscribe</a> | Visit us at {{appUrl}}</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Hello {{userName}},

          {{body}}

          Explore more in the AfricanMarket app.

          Best regards,
          AfricanMarket Team
          
          To unsubscribe, visit: {{appUrl}}/unsubscribe
        `
      },
      system: {
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>{{title}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #607D8B; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .button { display: inline-block; padding: 10px 20px; background: #607D8B; color: white; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>AfricanMarket System</h1>
              </div>
              <div class="content">
                <h2>Hello {{userName}},</h2>
                <p>{{body}}</p>
                <p><a href="{{appUrl}}" class="button">View in App</a></p>
              </div>
              <div class="footer">
                <p>This is a system message from AfricanMarket.</p>
                <p>Visit us at {{appUrl}}</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Hello {{userName}},

          {{body}}

          View more details in the AfricanMarket app.

          Best regards,
          AfricanMarket Team
        `
      }
    }

    return templates[type as keyof typeof templates] || templates.system
  }

  // Save email notification to database
  private async saveEmailNotificationToDatabase(
    payload: NotificationPayload,
    email: string,
    content: { subject: string; html: string; text: string }
  ): Promise<void> {
    try {
      await prisma.emailNotification.create({
        data: {
          userId: payload.userId,
          email,
          subject: content.subject,
          body: content.html,
          template: payload.type,
          status: 'SENT',
          sentAt: new Date(),
          fromEmail: this.smtpConfig.auth.user,
          fromName: 'AfricanMarket',
          orderId: payload.orderId,
          rideId: payload.rideId,
          vendorId: payload.vendorId,
          driverId: payload.driverId
        }
      })
    } catch (error) {
      console.error('Error saving email notification to database:', error)
    }
  }

  // Send welcome email
  async sendWelcomeEmail(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      })

      if (!user?.email) return

      const payload: NotificationPayload = {
        userId,
        title: 'Welcome to AfricanMarket!',
        body: `Welcome to AfricanMarket! We're excited to have you join our community. Explore authentic African products, delicious cuisine, and reliable transportation services all in one place.`,
        type: 'system'
      }

      await this.sendNotification(payload)
    } catch (error) {
      console.error('Error sending welcome email:', error)
    }
  }

  // Send order confirmation email
  async sendOrderConfirmationEmail(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          vendor: true,
          items: {
            include: {
              product: true
            }
          }
        }
      })

      if (!order) return

      const payload: NotificationPayload = {
        userId: order.customerId,
        title: 'Order Confirmation',
        body: `Your order #${order.orderNumber} has been confirmed! Your delicious meal from ${order.vendor.businessName} is being prepared.`,
        type: 'order',
        orderId: order.id
      }

      await this.sendNotification(payload)
    } catch (error) {
      console.error('Error sending order confirmation email:', error)
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    try {
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`
      
      const content = {
        subject: 'Password Reset Request',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Password Reset</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #FF6B35; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
              .button { display: inline-block; padding: 10px 20px; background: #FF6B35; color: white; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>AfricanMarket</h1>
              </div>
              <div class="content">
                <h2>Password Reset Request</h2>
                <p>You requested to reset your password. Click the button below to set a new password:</p>
                <p><a href="${resetUrl}" class="button">Reset Password</a></p>
                <p>If you didn't request this, please ignore this email.</p>
                <p>This link will expire in 1 hour.</p>
              </div>
              <div class="footer">
                <p>This is an automated message from AfricanMarket.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Password Reset Request

          You requested to reset your password. Click the link below to set a new password:
          ${resetUrl}

          If you didn't request this, please ignore this email.
          This link will expire in 1 hour.

          AfricanMarket Team
        `
      }

      await this.sendEmail(email, content)
    } catch (error) {
      console.error('Error sending password reset email:', error)
    }
  }

  // Process email queue
  async processEmailQueue(): Promise<void> {
    try {
      const pendingEmails = await prisma.emailNotification.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { scheduleFor: { lte: new Date() } },
            { scheduleFor: null }
          ]
        },
        take: 50,
        orderBy: { createdAt: 'asc' }
      })

      for (const email of pendingEmails) {
        await this.processQueuedEmail(email)
      }
    } catch (error) {
      console.error('Error processing email queue:', error)
    }
  }

  // Process individual queued email
  private async processQueuedEmail(email: any): Promise<void> {
    try {
      const content = {
        subject: email.subject,
        html: email.body,
        text: email.body.replace(/<[^>]*>/g, '') // Strip HTML tags
      }

      await this.sendEmail(email.email, content)
      
      await prisma.emailNotification.update({
        where: { id: email.id },
        data: {
          status: 'SENT',
          sentAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error processing queued email:', error)
      
      await prisma.emailNotification.update({
        where: { id: email.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: error instanceof Error ? error.message : 'Unknown error',
          retryCount: email.retryCount + 1
        }
      })
    }
  }

  // Get email analytics
  async getEmailAnalytics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const stats = await prisma.emailNotification.groupBy({
        by: ['status', 'template'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        }
      })

      return {
        totalEmails: stats.reduce((sum, stat) => sum + stat._count.id, 0),
        breakdown: stats
      }
    } catch (error) {
      console.error('Error getting email analytics:', error)
      return null
    }
  }
}

