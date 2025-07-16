
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const scheduleRideSchema = z.object({
  rideType: z.enum(['STANDARD', 'PREMIUM', 'SHARED']).default('STANDARD'),
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  pickupLatitude: z.number(),
  pickupLongitude: z.number(),
  destinationAddress: z.string().min(1, 'Destination address is required'),
  destinationLatitude: z.number(),
  destinationLongitude: z.number(),
  scheduledFor: z.string().refine((val) => new Date(val) > new Date(), {
    message: 'Scheduled time must be in the future'
  }),
  passengers: z.number().min(1).max(8).default(1),
  notes: z.string().optional(),
  preferredDriverId: z.string().optional(),
  maxFare: z.number().optional(),
  isRecurring: z.boolean().default(false),
  recurringType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  recurringDays: z.array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])).optional(),
  recurringUntil: z.string().optional(),
})

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = scheduleRideSchema.parse(body)

    const scheduledFor = new Date(validatedData.scheduledFor)
    const recurringUntil = validatedData.recurringUntil ? new Date(validatedData.recurringUntil) : null

    // Calculate next ride time if recurring
    let nextRideAt: Date | null = null
    if (validatedData.isRecurring && validatedData.recurringType) {
      nextRideAt = calculateNextRideTime(scheduledFor, validatedData.recurringType, validatedData.recurringDays)
    }

    const rideSchedule = await prisma.rideSchedule.create({
      data: {
        customerId: session.user.id,
        rideType: validatedData.rideType,
        pickupAddress: validatedData.pickupAddress,
        pickupLatitude: validatedData.pickupLatitude,
        pickupLongitude: validatedData.pickupLongitude,
        destinationAddress: validatedData.destinationAddress,
        destinationLatitude: validatedData.destinationLatitude,
        destinationLongitude: validatedData.destinationLongitude,
        scheduledFor,
        passengers: validatedData.passengers,
        notes: validatedData.notes,
        preferredDriverId: validatedData.preferredDriverId,
        maxFare: validatedData.maxFare,
        isRecurring: validatedData.isRecurring,
        recurringType: validatedData.recurringType,
        recurringDays: validatedData.recurringDays || [],
        recurringUntil,
        nextRideAt,
      }
    })

    return NextResponse.json({
      success: true,
      data: rideSchedule,
      message: 'Ride scheduled successfully'
    })

  } catch (error) {
    console.error('Error scheduling ride:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to schedule ride' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const isRecurring = searchParams.get('isRecurring')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereClause: any = {
      customerId: session.user.id,
    }

    if (status) {
      whereClause.status = status
    }

    if (isRecurring !== null) {
      whereClause.isRecurring = isRecurring === 'true'
    }

    const schedules = await prisma.rideSchedule.findMany({
      where: whereClause,
      orderBy: {
        scheduledFor: 'asc'
      },
      skip: offset,
      take: limit,
    })

    const totalSchedules = await prisma.rideSchedule.count({
      where: whereClause,
    })

    return NextResponse.json({
      success: true,
      data: {
        schedules,
        pagination: {
          total: totalSchedules,
          limit,
          offset,
          pages: Math.ceil(totalSchedules / limit),
        }
      }
    })

  } catch (error) {
    console.error('Error fetching scheduled rides:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled rides' },
      { status: 500 }
    )
  }
}
