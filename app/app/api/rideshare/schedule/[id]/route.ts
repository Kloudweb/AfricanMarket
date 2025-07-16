
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateScheduleSchema = z.object({
  rideType: z.enum(['STANDARD', 'PREMIUM', 'SHARED']).optional(),
  pickupAddress: z.string().min(1).optional(),
  pickupLatitude: z.number().optional(),
  pickupLongitude: z.number().optional(),
  destinationAddress: z.string().min(1).optional(),
  destinationLatitude: z.number().optional(),
  destinationLongitude: z.number().optional(),
  scheduledFor: z.string().optional(),
  passengers: z.number().min(1).max(8).optional(),
  notes: z.string().optional(),
  preferredDriverId: z.string().optional(),
  maxFare: z.number().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).optional(),
  isRecurring: z.boolean().optional(),
  recurringType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  recurringDays: z.array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])).optional(),
  recurringUntil: z.string().optional(),
})

interface Props {
  params: { id: string }
}

function calculateNextRideTime(
  baseTime: Date,
  recurringType: string,
  recurringDays?: string[]
): Date {
  const nextTime = new Date(baseTime)
  
  switch (recurringType) {
    case 'DAILY':
      nextTime.setDate(nextTime.getDate() + 1)
      break
    case 'WEEKLY':
      nextTime.setDate(nextTime.getDate() + 7)
      break
    case 'MONTHLY':
      nextTime.setMonth(nextTime.getMonth() + 1)
      break
  }
  
  return nextTime
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schedule = await prisma.rideSchedule.findFirst({
      where: {
        id: params.id,
        customerId: session.user.id,
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: schedule
    })

  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
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
    const validatedData = updateScheduleSchema.parse(body)

    // Check if schedule belongs to user
    const schedule = await prisma.rideSchedule.findFirst({
      where: {
        id: params.id,
        customerId: session.user.id,
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = { ...validatedData }

    if (validatedData.scheduledFor) {
      updateData.scheduledFor = new Date(validatedData.scheduledFor)
    }

    if (validatedData.recurringUntil) {
      updateData.recurringUntil = new Date(validatedData.recurringUntil)
    }

    // Calculate next ride time if recurring settings changed
    if (validatedData.isRecurring && validatedData.recurringType && validatedData.scheduledFor) {
      updateData.nextRideAt = calculateNextRideTime(
        new Date(validatedData.scheduledFor),
        validatedData.recurringType,
        validatedData.recurringDays
      )
    } else if (validatedData.isRecurring === false) {
      updateData.nextRideAt = null
    }

    const updatedSchedule = await prisma.rideSchedule.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: updatedSchedule,
      message: 'Schedule updated successfully'
    })

  } catch (error) {
    console.error('Error updating schedule:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update schedule' },
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

    // Check if schedule belongs to user
    const schedule = await prisma.rideSchedule.findFirst({
      where: {
        id: params.id,
        customerId: session.user.id,
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    await prisma.rideSchedule.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting schedule:', error)
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    )
  }
}
