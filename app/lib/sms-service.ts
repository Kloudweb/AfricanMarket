
export class SMSService {
  private twilioClient: any
  private fromNumber: string

  constructor() {
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890'
    
    // Initialize Twilio client if credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilio = require('twilio')
      this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    }
  }

  // Send SMS verification code
  async sendVerificationCode(phone: string, name: string, verificationCode: string): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        console.log('SMS Service: Twilio not configured, logging verification code:', verificationCode)
        return true // Return true for development
      }

      const message = `Hello ${name}! Your AfricanMarket verification code is: ${verificationCode}. This code will expire in 15 minutes.`

      await this.twilioClient.messages.create({
        body: message,
        from: this.fromNumber,
        to: this.formatPhoneNumber(phone)
      })

      return true
    } catch (error) {
      console.error('SMS verification send error:', error)
      return false
    }
  }

  // Send password reset SMS
  async sendPasswordResetSMS(phone: string, name: string, resetCode: string): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        console.log('SMS Service: Twilio not configured, logging reset code:', resetCode)
        return true // Return true for development
      }

      const message = `Hello ${name}! Your AfricanMarket password reset code is: ${resetCode}. This code will expire in 1 hour.`

      await this.twilioClient.messages.create({
        body: message,
        from: this.fromNumber,
        to: this.formatPhoneNumber(phone)
      })

      return true
    } catch (error) {
      console.error('SMS password reset send error:', error)
      return false
    }
  }

  // Send order notification SMS
  async sendOrderNotification(phone: string, name: string, orderNumber: string, status: string): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        console.log('SMS Service: Twilio not configured, logging order notification')
        return true // Return true for development
      }

      const statusMessages = {
        CONFIRMED: 'Your order has been confirmed and is being prepared.',
        PREPARING: 'Your order is being prepared.',
        READY_FOR_PICKUP: 'Your order is ready for pickup.',
        OUT_FOR_DELIVERY: 'Your order is out for delivery.',
        DELIVERED: 'Your order has been delivered. Thank you for choosing AfricanMarket!',
        CANCELLED: 'Your order has been cancelled. Please contact support if you have questions.'
      }

      const message = `Hello ${name}! Order ${orderNumber}: ${statusMessages[status as keyof typeof statusMessages] || 'Status updated.'}`

      await this.twilioClient.messages.create({
        body: message,
        from: this.fromNumber,
        to: this.formatPhoneNumber(phone)
      })

      return true
    } catch (error) {
      console.error('SMS order notification send error:', error)
      return false
    }
  }

  // Send ride notification SMS
  async sendRideNotification(phone: string, name: string, rideNumber: string, status: string): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        console.log('SMS Service: Twilio not configured, logging ride notification')
        return true // Return true for development
      }

      const statusMessages = {
        ACCEPTED: 'Your ride has been accepted. Driver is on the way.',
        DRIVER_ARRIVING: 'Your driver is arriving at the pickup location.',
        IN_PROGRESS: 'Your ride is in progress.',
        COMPLETED: 'Your ride has been completed. Thank you for choosing AfricanMarket!',
        CANCELLED: 'Your ride has been cancelled. Please contact support if you have questions.'
      }

      const message = `Hello ${name}! Ride ${rideNumber}: ${statusMessages[status as keyof typeof statusMessages] || 'Status updated.'}`

      await this.twilioClient.messages.create({
        body: message,
        from: this.fromNumber,
        to: this.formatPhoneNumber(phone)
      })

      return true
    } catch (error) {
      console.error('SMS ride notification send error:', error)
      return false
    }
  }

  // Send account security alert SMS
  async sendSecurityAlert(phone: string, name: string, alertType: string, details: string): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        console.log('SMS Service: Twilio not configured, logging security alert')
        return true // Return true for development
      }

      const alertMessages = {
        LOGIN_SUSPICIOUS: 'Suspicious login detected on your AfricanMarket account.',
        PASSWORD_CHANGED: 'Your AfricanMarket account password has been changed.',
        ACCOUNT_LOCKED: 'Your AfricanMarket account has been temporarily locked.',
        DOCUMENT_VERIFIED: 'Your document has been verified and approved.',
        DOCUMENT_REJECTED: 'Your document verification was rejected.'
      }

      const message = `Hello ${name}! Security Alert: ${alertMessages[alertType as keyof typeof alertMessages] || alertType} ${details}`

      await this.twilioClient.messages.create({
        body: message,
        from: this.fromNumber,
        to: this.formatPhoneNumber(phone)
      })

      return true
    } catch (error) {
      console.error('SMS security alert send error:', error)
      return false
    }
  }

  // Format phone number for international format
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Add country code if not present
    if (cleaned.length === 10) {
      return `+1${cleaned}`
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`
    }
    
    return phone
  }

  // Validate phone number format
  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^(\+1|1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/
    return phoneRegex.test(phone)
  }
}

export const smsService = new SMSService()
