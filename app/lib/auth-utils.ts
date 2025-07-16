
import crypto from 'crypto'
import { prisma } from './db'
import { TokenType } from './types'

export class AuthUtils {
  // Generate secure random token
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  // Generate numeric code for SMS/Email verification
  static generateVerificationCode(length: number = 6): string {
    const min = Math.pow(10, length - 1)
    const max = Math.pow(10, length) - 1
    return Math.floor(Math.random() * (max - min + 1) + min).toString()
  }

  // Hash password with salt
  static async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcryptjs')
    return bcrypt.hash(password, 10)
  }

  // Compare password with hash
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcryptjs')
    return bcrypt.compare(password, hash)
  }

  // Create verification token
  static async createVerificationToken(
    userId: string,
    type: TokenType,
    expiresInMinutes: number = 15
  ): Promise<{ token: string; code?: string }> {
    const token = this.generateToken()
    const code = type === TokenType.EMAIL_VERIFICATION || type === TokenType.PHONE_VERIFICATION 
      ? this.generateVerificationCode() 
      : undefined

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)

    // Invalidate any existing tokens of the same type
    await prisma.verificationToken.updateMany({
      where: {
        userId,
        type,
        used: false
      },
      data: {
        used: true,
        usedAt: new Date()
      }
    })

    // Create new token
    await prisma.verificationToken.create({
      data: {
        userId,
        type,
        token,
        code,
        expiresAt
      }
    })

    return { token, code }
  }

  // Verify token
  static async verifyToken(
    token: string,
    type: TokenType,
    code?: string
  ): Promise<{ success: boolean; userId?: string; message?: string }> {
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        token,
        type,
        used: false
      }
    })

    if (!tokenRecord) {
      return { success: false, message: 'Invalid or expired token' }
    }

    if (tokenRecord.expiresAt < new Date()) {
      return { success: false, message: 'Token has expired' }
    }

    if (tokenRecord.attempts >= tokenRecord.maxAttempts) {
      return { success: false, message: 'Maximum attempts exceeded' }
    }

    // For email/SMS verification, check the code
    if (code && tokenRecord.code !== code) {
      // Increment attempts
      await prisma.verificationToken.update({
        where: { id: tokenRecord.id },
        data: { attempts: tokenRecord.attempts + 1 }
      })

      return { success: false, message: 'Invalid verification code' }
    }

    // Mark token as used
    await prisma.verificationToken.update({
      where: { id: tokenRecord.id },
      data: {
        used: true,
        usedAt: new Date()
      }
    })

    return { success: true, userId: tokenRecord.userId }
  }

  // Check if user is locked out
  static async checkUserLockout(email: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return { locked: false }
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { locked: true, lockedUntil: user.lockedUntil }
    }

    return { locked: false }
  }

  // Record login attempt
  static async recordLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string | undefined,
    successful: boolean,
    failureReason?: string
  ): Promise<void> {
    await prisma.loginAttempt.create({
      data: {
        email,
        ipAddress,
        userAgent,
        successful,
        failureReason
      }
    })

    if (!successful) {
      await this.handleFailedLogin(email)
    } else {
      // Reset failed attempts on successful login
      await prisma.user.updateMany({
        where: { email },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      })
    }
  }

  // Handle failed login attempts
  static async handleFailedLogin(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) return

    const newFailedAttempts = user.failedLoginAttempts + 1
    const lockoutThreshold = 5 // Lock after 5 failed attempts

    let updateData: any = {
      failedLoginAttempts: newFailedAttempts
    }

    if (newFailedAttempts >= lockoutThreshold) {
      // Lock account for 30 minutes
      updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000)
    }

    await prisma.user.update({
      where: { email },
      data: updateData
    })
  }

  // Calculate profile completion score
  static calculateProfileCompletion(user: any, role: string): number {
    const baseFields = ['name', 'email', 'phone', 'address', 'city', 'province', 'postalCode']
    const roleSpecificFields: { [key: string]: string[] } = {
      VENDOR: ['businessName', 'businessType', 'businessCategory', 'businessAddress', 'businessPhone'],
      DRIVER: ['licenseNumber', 'vehicleType', 'vehicleMake', 'vehicleModel', 'vehicleYear', 'vehiclePlate'],
      CUSTOMER: []
    }

    const requiredFields = [...baseFields, ...(roleSpecificFields[role] || [])]
    const completedFields = requiredFields.filter(field => {
      const value = user[field] || (user.vendorProfile && user.vendorProfile[field]) || (user.driverProfile && user.driverProfile[field])
      return value !== null && value !== undefined && value !== ''
    })

    return Math.round((completedFields.length / requiredFields.length) * 100)
  }

  // Get user's IP address from request
  static getIPAddress(req: any): string {
    const forwardedFor = req.headers.get?.('x-forwarded-for') || req.headers['x-forwarded-for']
    const realIp = req.headers.get?.('x-real-ip') || req.headers['x-real-ip']
    
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }
    
    if (realIp) {
      return realIp
    }
    
    return '127.0.0.1'
  }

  // Get user agent from request
  static getUserAgent(req: any): string {
    return req.headers.get?.('user-agent') || req.headers['user-agent'] || 'Unknown'
  }

  // Create audit log entry
  static async createAuditLog(
    userId: string | undefined,
    action: string,
    resource?: string,
    resourceId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent
      }
    })
  }

  // Validate password strength
  static validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' }
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' }
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' }
    }

    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' }
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' }
    }

    return { valid: true }
  }

  // Validate email format
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate phone number format (Canadian format)
  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^(\+1|1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/
    return phoneRegex.test(phone)
  }

  // Format phone number to standard format
  static formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    const match = cleaned.match(/^(1)?(\d{3})(\d{3})(\d{4})$/)
    if (match) {
      return `+1${match[2]}${match[3]}${match[4]}`
    }
    return phone
  }

  // Generate password reset token
  static async generatePasswordResetToken(email: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) return null

    const token = this.generateToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expiresAt
      }
    })

    return token
  }

  // Verify password reset token
  static async verifyPasswordResetToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date()
        }
      }
    })

    if (!user) {
      return { valid: false }
    }

    return { valid: true, userId: user.id }
  }

  // Reset password
  static async resetPassword(
    token: string,
    newPassword: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ success: boolean; message?: string }> {
    const verification = await this.verifyPasswordResetToken(token)
    
    if (!verification.valid || !verification.userId) {
      return { success: false, message: 'Invalid or expired reset token' }
    }

    const passwordValidation = this.validatePasswordStrength(newPassword)
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.message }
    }

    const hashedPassword = await this.hashPassword(newPassword)

    const user = await prisma.user.update({
      where: { id: verification.userId },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    })

    // Log the password reset
    await prisma.passwordResetLog.create({
      data: {
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent,
        tokenUsed: token,
        successful: true
      }
    })

    await this.createAuditLog(
      user.id,
      'PASSWORD_RESET',
      'user',
      user.id,
      { success: true },
      ipAddress,
      userAgent
    )

    return { success: true }
  }
}
