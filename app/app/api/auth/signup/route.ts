
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { UserRole, KYCStatus } from "@prisma/client"
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
      confirmPassword,
      name,
      firstName,
      lastName,
      role, 
      phone,
      acceptTerms,
      acceptMarketing,
      // Vendor specific fields
      businessName,
      businessType,
      businessCategory,
      businessSubcategory,
      businessAddress,
      businessCity,
      businessProvince,
      businessPostalCode,
      businessPhone,
      businessEmail,
      businessWebsite,
      cuisineTypes,
      description,
      // Driver specific fields
      licenseNumber,
      licenseClass,
      licenseExpiry,
      licenseIssuedBy,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      vehiclePlate,
      vehicleVin,
      serviceTypes,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation
    } = requestData

    // Validate required fields
    if (!email || !password || !confirmPassword || !name || !acceptTerms) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Validate password match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      )
    }

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
      firstName,
      lastName,
      role: role || UserRole.CUSTOMER,
      phone: phone ? AuthUtils.formatPhoneNumber(phone) : undefined,
      acceptTerms,
      acceptMarketing: acceptMarketing || false
    }

    // Create user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: userData
      })

      // Create role-specific profile
      if (role === UserRole.VENDOR && businessName) {
        await tx.vendor.create({
          data: {
            userId: user.id,
            businessName,
            businessType: businessType || 'Restaurant',
            businessCategory: businessCategory || 'Food & Beverage',
            businessSubcategory,
            address: businessAddress || '',
            city: businessCity || '',
            province: businessProvince || 'Newfoundland and Labrador',
            postalCode: businessPostalCode || '',
            phone: businessPhone || phone || '',
            businessEmail,
            businessWebsite,
            cuisineTypes: cuisineTypes || [],
            description
          }
        })
      } else if (role === UserRole.DRIVER && licenseNumber) {
        await tx.driver.create({
          data: {
            userId: user.id,
            licenseNumber,
            licenseClass: licenseClass || 'Class 5',
            licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
            licenseIssuedBy: licenseIssuedBy || 'Newfoundland and Labrador',
            vehicleType: vehicleType || 'Car',
            vehicleMake: vehicleMake || '',
            vehicleModel: vehicleModel || '',
            vehicleYear: vehicleYear || new Date().getFullYear(),
            vehicleColor: vehicleColor || '',
            vehiclePlate: vehiclePlate || '',
            vehicleVin,
            serviceTypes: serviceTypes || ['DELIVERY'],
            emergencyContactName: emergencyContactName || '',
            emergencyContactPhone: emergencyContactPhone || '',
            emergencyContactRelation: emergencyContactRelation || ''
          }
        })
      }

      return user
    })

    // Create audit log
    await AuthUtils.createAuditLog(
      result.id,
      'SIGNUP',
      'user',
      result.id,
      { 
        role: result.role,
        method: 'credentials',
        hasVendorProfile: role === UserRole.VENDOR,
        hasDriverProfile: role === UserRole.DRIVER
      },
      ipAddress,
      userAgent
    )

    // Initialize KYC application for vendors and drivers
    if (role === UserRole.VENDOR || role === UserRole.DRIVER) {
      await verificationService.initializeKYCApplication(result.id)
    }

    // Send welcome email
    await emailService.sendWelcomeEmail(
      result.email,
      result.name || 'User',
      result.role
    )

    // Send email verification
    await verificationService.sendEmailVerification(result.id)

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
