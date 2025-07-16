
import { NextRequest, NextResponse } from "next/server"
import { verificationService } from "@/lib/verification-service"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { token, code } = await request.json()

    if (!token || !code) {
      return NextResponse.json(
        { error: "Token and code are required" },
        { status: 400 }
      )
    }

    const result = await verificationService.verifyPhone(token, code)

    if (result.success) {
      return NextResponse.json({
        message: result.message
      })
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Phone verification confirm error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
