
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { UserRole, KYCStatus } from "@/lib/types"
import { AuthUtils } from "@/lib/auth-utils"
import { verificationService } from "@/lib/verification-service"
import { emailService } from "@/lib/email-service"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    const { 
      email, 
      password, 
      name,
      role, 
      phone,
      acceptTerms
    } = requestData

    // Validate required fields
    if (!email || !password || !name || !acceptTerms) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, name, and terms acceptance are required" },
        { status: 400 }
      )
    }

    // Validate email format
    if (!AuthUtils.validateEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Note: Password confirmation is handled on the frontend

    // Validate password strength
    const passwordValidation = AuthUtils.validatePasswordStrength(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    // Validate phone number if provided
    if (phone && !AuthUtils.validatePhoneNumber(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      )
    }

    // Get IP address and user agent for audit log
    const ipAddress = AuthUtils.getIPAddress(request)
    const userAgent = AuthUtils.getUserAgent(request)

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Prepare user data
    const userData = {
      email,
      password: hashedPassword,
      name,
      role: role || UserRole.CUSTOMER,
      phone: phone ? AuthUtils.formatPhoneNumber(phone) : undefined,
      // acceptTerms is not stored in database - only used for validation
    }

    // Create user
    const result = await prisma.user.create({
      data: userData
    })

    // Create audit log
    try {
      await AuthUtils.createAuditLog(
        result.id,
        'SIGNUP',
        'user',
        result.id,
        { 
          role: result.role,
          method: 'credentials'
        },
        ipAddress,
        userAgent
      )
    } catch (error) {
      console.error("Audit log error:", error)
    }

    // Initialize KYC application for vendors and drivers
    try {
      if (role === UserRole.VENDOR || role === UserRole.DRIVER) {
        await verificationService.initializeKYCApplication(result.id)
      }
    } catch (error) {
      console.error("KYC initialization error:", error)
    }

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(
        result.email,
        result.name || 'User',
        result.role
      )
    } catch (error) {
      console.error("Welcome email error:", error)
    }

    // Send email verification
    try {
      await verificationService.sendEmailVerification(result.id)
    } catch (error) {
      console.error("Email verification error:", error)
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = result

    return NextResponse.json(
      { 
        user: userWithoutPassword,
        message: "Account created successfully. Please check your email to verify your account."
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
