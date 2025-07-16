
import { prisma } from './db'
import { AuthUtils } from './auth-utils'
import { emailService } from './email-service'
import { smsService } from './sms-service'
import { TokenType, UserRole, KYCStatus } from '@prisma/client'

export class VerificationService {
  // Send email verification
  async sendEmailVerification(userId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return { success: false, message: 'User not found' }
      }

      if (user.emailVerified) {
        return { success: false, message: 'Email already verified' }
      }

      const { token, code } = await AuthUtils.createVerificationToken(
        userId,
        TokenType.EMAIL_VERIFICATION,
        15 // 15 minutes
      )

      if (!code) {
        return { success: false, message: 'Failed to generate verification code' }
      }

      const emailSent = await emailService.sendEmailVerification(
        user.email,
        user.name || 'User',
        code
      )

      if (!emailSent) {
        return { success: false, message: 'Failed to send verification email' }
      }

      return { success: true, message: 'Verification email sent successfully' }
    } catch (error) {
      console.error('Email verification error:', error)
      return { success: false, message: 'Failed to send verification email' }
    }
  }

  // Verify email with code
  async verifyEmail(token: string, code: string): Promise<{ success: boolean; message?: string }> {
    try {
      const verification = await AuthUtils.verifyToken(token, TokenType.EMAIL_VERIFICATION, code)

      if (!verification.success || !verification.userId) {
        return { success: false, message: verification.message }
      }

      // Update user's email verification status
      await prisma.user.update({
        where: { id: verification.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date()
        }
      })

      // Check if this completes profile verification
      await this.checkAndUpdateProfileCompletion(verification.userId)

      return { success: true, message: 'Email verified successfully' }
    } catch (error) {
      console.error('Email verification error:', error)
      return { success: false, message: 'Failed to verify email' }
    }
  }

  // Send phone verification
  async sendPhoneVerification(userId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return { success: false, message: 'User not found' }
      }

      if (!user.phone) {
        return { success: false, message: 'Phone number not provided' }
      }

      if (user.phoneVerified) {
        return { success: false, message: 'Phone number already verified' }
      }

      const { token, code } = await AuthUtils.createVerificationToken(
        userId,
        TokenType.PHONE_VERIFICATION,
        15 // 15 minutes
      )

      if (!code) {
        return { success: false, message: 'Failed to generate verification code' }
      }

      const smsSent = await smsService.sendVerificationCode(
        user.phone,
        user.name || 'User',
        code
      )

      if (!smsSent) {
        return { success: false, message: 'Failed to send verification SMS' }
      }

      return { success: true, message: 'Verification SMS sent successfully' }
    } catch (error) {
      console.error('Phone verification error:', error)
      return { success: false, message: 'Failed to send verification SMS' }
    }
  }

  // Verify phone with code
  async verifyPhone(token: string, code: string): Promise<{ success: boolean; message?: string }> {
    try {
      const verification = await AuthUtils.verifyToken(token, TokenType.PHONE_VERIFICATION, code)

      if (!verification.success || !verification.userId) {
        return { success: false, message: verification.message }
      }

      // Update user's phone verification status
      await prisma.user.update({
        where: { id: verification.userId },
        data: {
          phoneVerified: true,
          phoneVerifiedAt: new Date()
        }
      })

      // Check if this completes profile verification
      await this.checkAndUpdateProfileCompletion(verification.userId)

      return { success: true, message: 'Phone verified successfully' }
    } catch (error) {
      console.error('Phone verification error:', error)
      return { success: false, message: 'Failed to verify phone' }
    }
  }

  // Initialize KYC application based on user role
  async initializeKYCApplication(userId: string): Promise<{ success: boolean; kycId?: string; message?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          kycApplications: true
        }
      })

      if (!user) {
        return { success: false, message: 'User not found' }
      }

      // Check if user already has a KYC application
      const existingKYC = user.kycApplications.find(kyc => kyc.status !== KYCStatus.REJECTED)
      if (existingKYC) {
        return { success: true, kycId: existingKYC.id, message: 'KYC application already exists' }
      }

      // Set required documents based on user role
      const roleRequirements = this.getKYCRequirements(user.role)

      const kycApplication = await prisma.kYCApplication.create({
        data: {
          userId,
          applicationLevel: 'BASIC',
          ...roleRequirements
        }
      })

      return { success: true, kycId: kycApplication.id, message: 'KYC application initialized' }
    } catch (error) {
      console.error('KYC initialization error:', error)
      return { success: false, message: 'Failed to initialize KYC application' }
    }
  }

  // Get KYC requirements based on user role
  private getKYCRequirements(role: UserRole): any {
    const baseRequirements = {
      profilePhotoRequired: true,
      governmentIdRequired: true,
      proofOfAddressRequired: true
    }

    const roleSpecificRequirements = {
      CUSTOMER: baseRequirements,
      VENDOR: {
        ...baseRequirements,
        businessLicenseRequired: true,
        foodSafetyRequired: true
      },
      DRIVER: {
        ...baseRequirements,
        driversLicenseRequired: true,
        vehicleRegistrationRequired: true,
        vehicleInsuranceRequired: true
      },
      ADMIN: baseRequirements
    }

    return roleSpecificRequirements[role] || baseRequirements
  }

  // Update KYC application status
  async updateKYCStatus(
    kycId: string,
    status: KYCStatus,
    reviewedBy?: string,
    rejectionReason?: string,
    notes?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const updateData: any = {
        status,
        reviewedAt: new Date(),
        reviewedBy,
        rejectionReason,
        notes
      }

      if (status === KYCStatus.APPROVED) {
        updateData.approvedAt = new Date()
      } else if (status === KYCStatus.REJECTED) {
        updateData.rejectedAt = new Date()
      }

      const kycApplication = await prisma.kYCApplication.update({
        where: { id: kycId },
        data: updateData,
        include: {
          user: true
        }
      })

      // Update user's KYC verification status
      if (status === KYCStatus.APPROVED) {
        await prisma.user.update({
          where: { id: kycApplication.userId },
          data: {
            kycVerified: true,
            kycVerifiedAt: new Date()
          }
        })

        // Send approval notification
        await emailService.sendDocumentStatusEmail(
          kycApplication.user.email,
          kycApplication.user.name || 'User',
          'KYC Application',
          'APPROVED'
        )
      } else if (status === KYCStatus.REJECTED) {
        // Send rejection notification
        await emailService.sendDocumentStatusEmail(
          kycApplication.user.email,
          kycApplication.user.name || 'User',
          'KYC Application',
          'REJECTED',
          rejectionReason
        )
      }

      return { success: true, message: 'KYC status updated successfully' }
    } catch (error) {
      console.error('KYC status update error:', error)
      return { success: false, message: 'Failed to update KYC status' }
    }
  }

  // Calculate KYC completion score
  async calculateKYCCompletionScore(kycId: string): Promise<number> {
    try {
      const kycApplication = await prisma.kYCApplication.findUnique({
        where: { id: kycId },
        include: {
          documents: true
        }
      })

      if (!kycApplication) return 0

      const requiredDocuments = [
        'profilePhotoRequired',
        'governmentIdRequired',
        'proofOfAddressRequired',
        'businessLicenseRequired',
        'foodSafetyRequired',
        'driversLicenseRequired',
        'vehicleRegistrationRequired',
        'vehicleInsuranceRequired'
      ]

      const verifiedDocuments = [
        'profilePhotoVerified',
        'governmentIdVerified',
        'proofOfAddressVerified',
        'businessLicenseVerified',
        'foodSafetyVerified',
        'driversLicenseVerified',
        'vehicleRegistrationVerified',
        'vehicleInsuranceVerified'
      ]

      let totalRequired = 0
      let totalVerified = 0

      for (let i = 0; i < requiredDocuments.length; i++) {
        const required = requiredDocuments[i] as keyof typeof kycApplication
        const verified = verifiedDocuments[i] as keyof typeof kycApplication

        if (kycApplication[required]) {
          totalRequired++
          if (kycApplication[verified]) {
            totalVerified++
          }
        }
      }

      const score = totalRequired > 0 ? Math.round((totalVerified / totalRequired) * 100) : 0

      // Update the completion score in the database
      await prisma.kYCApplication.update({
        where: { id: kycId },
        data: { completionScore: score }
      })

      return score
    } catch (error) {
      console.error('KYC completion score calculation error:', error)
      return 0
    }
  }

  // Check and update profile completion
  private async checkAndUpdateProfileCompletion(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          vendorProfile: true,
          driverProfile: true
        }
      })

      if (!user) return

      const completionScore = AuthUtils.calculateProfileCompletion(user, user.role)
      const isCompleted = completionScore >= 80 // 80% completion threshold

      if (isCompleted && !user.profileCompleted) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            profileCompleted: true,
            profileCompletedAt: new Date()
          }
        })

        // Send welcome email for completed profile
        await emailService.sendWelcomeEmail(
          user.email,
          user.name || 'User',
          user.role
        )
      }
    } catch (error) {
      console.error('Profile completion check error:', error)
    }
  }

  // Get user verification status
  async getUserVerificationStatus(userId: string): Promise<{
    emailVerified: boolean
    phoneVerified: boolean
    kycVerified: boolean
    profileCompleted: boolean
    kycApplication?: any
    completionScore: number
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          kycApplications: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          vendorProfile: true,
          driverProfile: true
        }
      })

      if (!user) {
        return {
          emailVerified: false,
          phoneVerified: false,
          kycVerified: false,
          profileCompleted: false,
          completionScore: 0
        }
      }

      const completionScore = AuthUtils.calculateProfileCompletion(user, user.role)

      return {
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        kycVerified: user.kycVerified,
        profileCompleted: user.profileCompleted,
        kycApplication: user.kycApplications[0] || null,
        completionScore
      }
    } catch (error) {
      console.error('Get verification status error:', error)
      return {
        emailVerified: false,
        phoneVerified: false,
        kycVerified: false,
        profileCompleted: false,
        completionScore: 0
      }
    }
  }

  // Resend verification (email or phone)
  async resendVerification(userId: string, type: 'email' | 'phone'): Promise<{ success: boolean; message?: string }> {
    try {
      if (type === 'email') {
        return await this.sendEmailVerification(userId)
      } else {
        return await this.sendPhoneVerification(userId)
      }
    } catch (error) {
      console.error('Resend verification error:', error)
      return { success: false, message: 'Failed to resend verification' }
    }
  }

  // Clean up expired tokens
  async cleanupExpiredTokens(): Promise<void> {
    try {
      await prisma.verificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { used: true }
          ]
        }
      })
    } catch (error) {
      console.error('Token cleanup error:', error)
    }
  }
}

export const verificationService = new VerificationService()
