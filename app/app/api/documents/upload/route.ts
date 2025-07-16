
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cloudinaryService } from "@/lib/cloudinary-service"
import { prisma } from "@/lib/db"
import { DocumentType, DocumentStatus } from "@prisma/client"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('documentType') as DocumentType
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const expiresAt = formData.get('expiresAt') as string

    if (!file || !documentType || !title) {
      return NextResponse.json(
        { error: "File, document type, and title are required" },
        { status: 400 }
      )
    }

    // Validate file
    const validation = cloudinaryService.validateFile(file, documentType)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to Cloudinary
    const uploadResult = await cloudinaryService.uploadFile(
      buffer,
      file.name,
      file.type,
      documentType,
      session.user.id
    )

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || "Upload failed" },
        { status: 500 }
      )
    }

    // Save document record in database
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        type: documentType,
        title,
        description,
        fileName: file.name,
        filePath: uploadResult.secureUrl!,
        fileSize: file.size,
        mimeType: file.type,
        cloudinaryId: uploadResult.cloudinaryId,
        status: DocumentStatus.PENDING,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    })

    return NextResponse.json({
      message: "Document uploaded successfully",
      document: {
        id: document.id,
        type: document.type,
        title: document.title,
        status: document.status,
        uploadedAt: document.uploadedAt,
        filePath: document.filePath
      }
    })
  } catch (error) {
    console.error("Document upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
