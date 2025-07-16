

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Upload delivery photo
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const orderId = formData.get('orderId') as string
    const photoType = formData.get('photoType') as string || 'DELIVERY'
    const locationData = formData.get('location') as string
    const notes = formData.get('notes') as string

    if (!file || !orderId) {
      return NextResponse.json({ 
        error: 'Missing required fields: file, orderId' 
      }, { status: 400 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Verify driver is assigned to this order
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.driverId !== driver.id) {
      return NextResponse.json({ error: 'Unauthorized - not assigned to this order' }, { status: 403 })
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' 
      }, { status: 400 })
    }

    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 5MB' 
      }, { status: 400 })
    }

    // Convert file to base64 for simple storage
    // In production, you'd upload to a service like AWS S3, Cloudinary, etc.
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = file.type
    const photoUrl = `data:${mimeType};base64,${base64}`

    // Parse location if provided
    let location = null
    if (locationData) {
      try {
        location = JSON.parse(locationData)
      } catch (error) {
        console.error('Invalid location data:', error)
      }
    }

    // Create delivery photo record
    const deliveryPhoto = await prisma.driverDeliveryPhoto.create({
      data: {
        driverId: driver.id,
        orderId,
        photoUrl,
        photoType,
        location,
        fileSize: file.size,
        fileName: file.name,
        metadata: {
          notes: notes || null,
          timestamp: new Date().toISOString(),
          uploadedBy: session.user.id
        }
      }
    })

    // If this is a delivery confirmation photo, update the order
    if (photoType === 'DELIVERY') {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          actualDelivery: new Date()
        }
      })

      // Create or update delivery confirmation
      const deliveryConfirmation = await prisma.deliveryConfirmation.upsert({
        where: { orderId },
        update: {
          photos: {
            push: deliveryPhoto.id
          }
        },
        create: {
          orderId,
          driverId: driver.id,
          customerId: order.customerId,
          latitude: location?.lat || null,
          longitude: location?.lng || null,
          photos: [deliveryPhoto.id],
          notes: notes || null
        }
      })

      // Send notification to customer
      await prisma.notification.create({
        data: {
          userId: order.customerId,
          type: 'ORDER_DELIVERED',
          title: 'Order Delivered',
          message: `Your order #${order.orderNumber} has been delivered successfully.`
        }
      })
    }

    return NextResponse.json({
      message: 'Photo uploaded successfully',
      photo: {
        id: deliveryPhoto.id,
        photoType: deliveryPhoto.photoType,
        timestamp: deliveryPhoto.timestamp,
        fileSize: deliveryPhoto.fileSize,
        fileName: deliveryPhoto.fileName
      }
    })
  } catch (error) {
    console.error('Error uploading delivery photo:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get delivery photos
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')
    const photoType = searchParams.get('photoType')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const where: any = {
      driverId: driver.id
    }

    if (orderId) {
      where.orderId = orderId
    }

    if (photoType) {
      where.photoType = photoType
    }

    const [photos, total] = await Promise.all([
      prisma.driverDeliveryPhoto.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              vendor: {
                select: {
                  businessName: true
                }
              }
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.driverDeliveryPhoto.count({ where })
    ])

    return NextResponse.json({
      photos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching delivery photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
