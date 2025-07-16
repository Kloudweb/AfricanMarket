
import nodemailer from 'nodemailer'

export class EmailService {
  private transporter: nodemailer.Transporter
  private fromEmail: string

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@africanmarket.com'
    
    // Configure transporter based on environment
    if (process.env.SENDGRID_API_KEY) {
      this.transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      })
    } else {
      // Development mode - use ethereal email for testing
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: process.env.ETHEREAL_EMAIL || 'ethereal.user@ethereal.email',
          pass: process.env.ETHEREAL_PASSWORD || 'ethereal.pass'
        }
      })
    }
  }

  // Send email verification
  async sendEmailVerification(email: string, name: string, verificationCode: string): Promise<boolean> {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email - AfricanMarket</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f97316; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .verification-code { background: #fff; padding: 20px; margin: 20px 0; text-align: center; border: 2px dashed #f97316; }
            .code { font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #f97316; }
            .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
            .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AfricanMarket</h1>
              <p>Email Verification</p>
            </div>
            
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Thank you for registering with AfricanMarket. To complete your registration, please verify your email address.</p>
              
              <div class="verification-code">
                <p>Your verification code is:</p>
                <div class="code">${verificationCode}</div>
                <p>This code will expire in 15 minutes.</p>
              </div>
              
              <p>If you didn't request this verification, please ignore this email.</p>
              
              <p>Best regards,<br>The AfricanMarket Team</p>
            </div>
            
            <div class="footer">
              <p>&copy; 2024 AfricanMarket. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `

      const textContent = `
        Hello ${name}!

        Thank you for registering with AfricanMarket. To complete your registration, please verify your email address.

        Your verification code is: ${verificationCode}

        This code will expire in 15 minutes.

        If you didn't request this verification, please ignore this email.

        Best regards,
        The AfricanMarket Team
      `

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject: 'Verify Your Email - AfricanMarket',
        text: textContent,
        html: htmlContent
      })

      return true
    } catch (error) {
      console.error('Email verification send error:', error)
      return false
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<boolean> {
    try {
      const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset - AfricanMarket</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f97316; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .reset-section { background: #fff; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid #ddd; }
            .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
            .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AfricanMarket</h1>
              <p>Password Reset Request</p>
            </div>
            
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>We received a request to reset your password for your AfricanMarket account.</p>
              
              <div class="reset-section">
                <p>Click the button below to reset your password:</p>
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              </div>
              
              <div class="warning">
                <p><strong>Important:</strong></p>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password will remain unchanged until you create a new one</li>
                </ul>
              </div>
              
              <p>If you have any questions, please contact our support team.</p>
              
              <p>Best regards,<br>The AfricanMarket Team</p>
            </div>
            
            <div class="footer">
              <p>&copy; 2024 AfricanMarket. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `

      const textContent = `
        Hello ${name}!

        We received a request to reset your password for your AfricanMarket account.

        To reset your password, click the following link:
        ${resetUrl}

        This link will expire in 1 hour.

        If you didn't request this reset, please ignore this email.
        Your password will remain unchanged until you create a new one.

        Best regards,
        The AfricanMarket Team
      `

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject: 'Password Reset - AfricanMarket',
        text: textContent,
        html: htmlContent
      })

      return true
    } catch (error) {
      console.error('Password reset email send error:', error)
      return false
    }
  }

  // Send welcome email
  async sendWelcomeEmail(email: string, name: string, role: string): Promise<boolean> {
    try {
      const roleText = {
        CUSTOMER: 'customer',
        VENDOR: 'vendor',
        DRIVER: 'driver'
      }[role] || 'user'

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to AfricanMarket</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f97316; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .welcome-section { background: #fff; padding: 20px; margin: 20px 0; border: 1px solid #ddd; }
            .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
            .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
            .features { background: #fff; padding: 20px; margin: 20px 0; }
            .feature-item { margin: 10px 0; padding: 10px; border-left: 4px solid #f97316; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to AfricanMarket!</h1>
              <p>Your account has been successfully created</p>
            </div>
            
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Congratulations! Your AfricanMarket ${roleText} account has been successfully created and verified.</p>
              
              <div class="welcome-section">
                <h3>What's next?</h3>
                <p>Complete your profile to get the most out of AfricanMarket:</p>
                <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">Go to Dashboard</a>
              </div>
              
              <div class="features">
                <h3>As a ${roleText}, you can:</h3>
                ${role === 'CUSTOMER' ? `
                  <div class="feature-item">🛍️ Browse and order from local African vendors</div>
                  <div class="feature-item">🚗 Book rides with trusted drivers</div>
                  <div class="feature-item">⭐ Leave reviews and ratings</div>
                  <div class="feature-item">📱 Track your orders and rides in real-time</div>
                ` : ''}
                ${role === 'VENDOR' ? `
                  <div class="feature-item">🏪 Set up your business profile</div>
                  <div class="feature-item">📋 List your products and services</div>
                  <div class="feature-item">💰 Manage orders and earnings</div>
                  <div class="feature-item">📊 Access business analytics</div>
                ` : ''}
                ${role === 'DRIVER' ? `
                  <div class="feature-item">🚗 Complete your driver verification</div>
                  <div class="feature-item">📱 Accept delivery and ride requests</div>
                  <div class="feature-item">💵 Track your earnings</div>
                  <div class="feature-item">🗺️ Set your service areas</div>
                ` : ''}
              </div>
              
              <p>If you have any questions, our support team is here to help.</p>
              
              <p>Welcome to the AfricanMarket family!</p>
              <p>The AfricanMarket Team</p>
            </div>
            
            <div class="footer">
              <p>&copy; 2024 AfricanMarket. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject: 'Welcome to AfricanMarket!',
        html: htmlContent
      })

      return true
    } catch (error) {
      console.error('Welcome email send error:', error)
      return false
    }
  }

  // Send document verification status email
  async sendDocumentStatusEmail(
    email: string,
    name: string,
    documentType: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ): Promise<boolean> {
    try {
      const isApproved = status === 'APPROVED'
      const subject = `Document ${isApproved ? 'Approved' : 'Rejected'} - AfricanMarket`
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${isApproved ? '#10b981' : '#ef4444'}; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .status-section { background: #fff; padding: 20px; margin: 20px 0; border: 1px solid #ddd; }
            .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
            .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
            .success { background: #d1fae5; border: 1px solid #10b981; padding: 15px; margin: 15px 0; border-radius: 4px; }
            .error { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; margin: 15px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AfricanMarket</h1>
              <p>Document Verification ${isApproved ? 'Approved' : 'Rejected'}</p>
            </div>
            
            <div class="content">
              <h2>Hello ${name}!</h2>
              
              <div class="status-section">
                <h3>Document: ${documentType}</h3>
                <div class="${isApproved ? 'success' : 'error'}">
                  <p><strong>Status: ${status}</strong></p>
                  ${isApproved ? 
                    '<p>Your document has been successfully verified and approved.</p>' :
                    `<p>Your document has been rejected. Reason: ${rejectionReason || 'Please contact support for more details.'}</p>`
                  }
                </div>
                
                ${isApproved ? 
                  '<p>You can now access all features associated with your verified account.</p>' :
                  '<p>Please resubmit your document with the necessary corrections.</p>'
                }
                
                <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">Go to Dashboard</a>
              </div>
              
              <p>If you have any questions, please contact our support team.</p>
              
              <p>Best regards,<br>The AfricanMarket Team</p>
            </div>
            
            <div class="footer">
              <p>&copy; 2024 AfricanMarket. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject,
        html: htmlContent
      })

      return true
    } catch (error) {
      console.error('Document status email send error:', error)
      return false
    }
  }
}

export const emailService = new EmailService()
