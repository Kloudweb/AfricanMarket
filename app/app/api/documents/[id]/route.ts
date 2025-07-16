
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { cloudinaryService } from "@/lib/cloudinary-service"

export const dynamic = "force-dynamic"

// Get document by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Get document error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    // Delete from Cloudinary
    if (document.cloudinaryId) {
      await cloudinaryService.deleteFile(document.cloudinaryId)
    }

    // Delete from database
    await prisma.document.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: "Document deleted successfully"
    })
  } catch (error) {
    console.error("Delete document error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
