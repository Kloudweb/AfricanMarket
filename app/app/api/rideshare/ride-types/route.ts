
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createRideTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  displayName: z.string().min(1, 'Display name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  baseFare: z.number().min(0, 'Base fare must be positive'),
  perKmRate: z.number().min(0, 'Per km rate must be positive'),
  perMinuteRate: z.number().min(0, 'Per minute rate must be positive'),
  minimumFare: z.number().min(0, 'Minimum fare must be positive'),
  maximumFare: z.number().min(0).optional(),
  capacity: z.number().min(1).max(20).default(4),
  vehicleTypes: z.array(z.enum(['SEDAN', 'SUV', 'MINIVAN', 'LUXURY', 'COMPACT', 'TRUCK'])).default(['SEDAN']),
  minYear: z.number().min(2000).max(new Date().getFullYear() + 1).optional(),
  features: z.array(z.string()).default([]),
  surgePricing: z.boolean().default(false),
  maxSurge: z.number().min(1).max(10).default(3.0),
  availableHours: z.record(z.object({
    start: z.string(),
    end: z.string(),
    available: z.boolean()
  })).optional(),
  availableDays: z.array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])).default([
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
  ]),
  isActive: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createRideTypeSchema.parse(body)

    // Check if ride type name already exists
    const existingRideType = await prisma.rideType.findFirst({
      where: { name: validatedData.name }
    })

    if (existingRideType) {
      return NextResponse.json({
        error: 'Ride type with this name already exists'
      }, { status: 400 })
    }

    const rideType = await prisma.rideType.create({
      data: validatedData
    })

    return NextResponse.json({
      success: true,
      data: rideType,
      message: 'Ride type created successfully'
    })

  } catch (error) {
    console.error('Error creating ride type:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create ride type' },
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
    const isActive = searchParams.get('isActive')
    const availableNow = searchParams.get('availableNow')

    const whereClause: any = {}

    if (isActive !== null) {
      whereClause.isActive = isActive === 'true'
    }

    let rideTypes = await prisma.rideType.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc'
      }
    })

    // Filter by availability if requested
    if (availableNow === 'true') {
      const now = new Date()
      const currentHour = now.getHours()
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()

      rideTypes = rideTypes.filter(rideType => {
        // Check if available on current day
        if (!rideType.availableDays.includes(currentDay)) {
          return false
        }

        // Check if available at current hour
        if (rideType.availableHours) {
          const hourStr = currentHour.toString().padStart(2, '0') + ':00'
          const daySchedule = (rideType.availableHours as any)[currentDay]
          if (daySchedule && !daySchedule.available) {
            return false
          }
        }

        return true
      })
    }

    // Get driver counts for each ride type
    const rideTypesWithDrivers = await Promise.all(
      rideTypes.map(async (rideType) => {
        const availableDrivers = await prisma.driver.count({
          where: {
            isAvailable: true,
            verificationStatus: 'VERIFIED',
            vehicleType: {
              in: rideType.vehicleTypes
            }
          }
        })

        return {
          ...rideType,
          availableDrivers,
          estimatedWaitTime: availableDrivers > 0 ? '3-8 minutes' : 'No drivers available'
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        rideTypes: rideTypesWithDrivers,
        total: rideTypesWithDrivers.length
      }
    })

  } catch (error) {
    console.error('Error fetching ride types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ride types' },
      { status: 500 }
    )
  }
}
