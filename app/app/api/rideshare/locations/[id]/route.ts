
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required').optional(),
  address: z.string().min(1, 'Address is required').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  type: z.enum(['HOME', 'WORK', 'FAVORITE']).optional(),
  apartment: z.string().optional(),
  notes: z.string().optional(),
  isDefault: z.boolean().optional(),
})

interface Props {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const location = await prisma.savedLocation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: location
    })

  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateLocationSchema.parse(body)

    // Check if location belongs to user
    const location = await prisma.savedLocation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults of the same type
    if (validatedData.isDefault && validatedData.type) {
      await prisma.savedLocation.updateMany({
        where: {
          userId: session.user.id,
          type: validatedData.type,
          isDefault: true,
          id: { not: params.id },
        },
        data: {
          isDefault: false,
        }
      })
    }

    const updatedLocation = await prisma.savedLocation.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedLocation
    })

  } catch (error) {
    console.error('Error updating location:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if location belongs to user
    const location = await prisma.savedLocation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    await prisma.savedLocation.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    )
  }
}

// Increment usage count when location is used
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if location belongs to user
    const location = await prisma.savedLocation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const updatedLocation = await prisma.savedLocation.update({
      where: { id: params.id },
      data: {
        usageCount: { increment: 1 },
        lastUsed: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedLocation
    })

  } catch (error) {
    console.error('Error updating location usage:', error)
    return NextResponse.json(
      { error: 'Failed to update location usage' },
      { status: 500 }
    )
  }
}
