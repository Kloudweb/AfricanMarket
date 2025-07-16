
import { NextRequest, NextResponse } from "next/server"
import { AuthUtils } from "@/lib/auth-utils"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { token, password, confirmPassword } = await request.json()

    if (!token || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Token, password, and confirm password are required" },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      )
    }

    const passwordValidation = AuthUtils.validatePasswordStrength(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    const ipAddress = AuthUtils.getIPAddress(request)
    const userAgent = AuthUtils.getUserAgent(request)

    const result = await AuthUtils.resetPassword(
      token,
      password,
      ipAddress,
      userAgent
    )

    if (result.success) {
      return NextResponse.json({
        message: "Password reset successfully"
      })
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
