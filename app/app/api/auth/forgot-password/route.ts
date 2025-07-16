
import { NextRequest, NextResponse } from "next/server"
import { AuthUtils } from "@/lib/auth-utils"
import { emailService } from "@/lib/email-service"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    if (!AuthUtils.validateEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account with this email exists, a password reset link has been sent."
      })
    }

    const resetToken = await AuthUtils.generatePasswordResetToken(email)
    
    if (resetToken) {
      await emailService.sendPasswordResetEmail(
        email,
        user.name || 'User',
        resetToken
      )
    }

    return NextResponse.json({
      message: "If an account with this email exists, a password reset link has been sent."
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
