
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const requestRideSchema = z.object({
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  pickupLatitude: z.number(),
  pickupLongitude: z.number(),
  destinationAddress: z.string().min(1, 'Destination address is required'),
  destinationLatitude: z.number(),
  destinationLongitude: z.number(),
  rideType: z.enum(['STANDARD', 'PREMIUM', 'SHARED']).default('STANDARD'),
  passengers: z.number().min(1).max(8).default(1),
  isScheduled: z.boolean().default(false),
  scheduledFor: z.string().optional(),
  notes: z.string().optional(),
  maxFare: z.number().optional(),
  preferredDriverId: z.string().optional(),
  autoAccept: z.boolean().default(false),
  minRating: z.number().optional(),
  allowShared: z.boolean().default(false),
  requireChild: z.boolean().default(false),
  requireWheelchair: z.boolean().default(false),
})

function generateRideNumber(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8)
  return `R${timestamp}${random}`.toUpperCase()
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function estimateDuration(distance: number, rideType: string): number {
  const baseSpeed = rideType === 'SHARED' ? 35 : 45 // km/h
  const trafficFactor = 1.3 // Account for traffic
  return Math.ceil((distance / baseSpeed) * 60 * trafficFactor)
}

async function calculateFare(distance: number, duration: number, rideType: string): Promise<{
  baseFare: number
  distanceFare: number
  timeFare: number
  surgeFare: number
  surgeMultiplier: number
  totalFare: number
}> {
  // Get ride type pricing
  const rideTypeData = await prisma.rideType.findFirst({
    where: { name: rideType, isActive: true }
  })

  const baseFare = rideTypeData?.baseFare || 3.99
  const perKmRate = rideTypeData?.perKmRate || 2.50
  const perMinuteRate = rideTypeData?.perMinuteRate || 0.35

  // Check for surge pricing
  const surgeMultiplier = 1.0 // TODO: Implement surge pricing logic
  
  const distanceFare = distance * perKmRate
  const timeFare = duration * perMinuteRate
  const surgeFare = 0
  const totalFare = (baseFare + distanceFare + timeFare + surgeFare) * surgeMultiplier

  return {
    baseFare,
    distanceFare,
    timeFare,
    surgeFare,
    surgeMultiplier,
    totalFare
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = requestRideSchema.parse(body)

    // Calculate distance and duration
    const distance = calculateDistance(
      validatedData.pickupLatitude,
      validatedData.pickupLongitude,
      validatedData.destinationLatitude,
      validatedData.destinationLongitude
    )

    const duration = estimateDuration(distance, validatedData.rideType)

    // Calculate fare
    const fareData = await calculateFare(distance, duration, validatedData.rideType)

    // Create ride
    const rideNumber = generateRideNumber()
    const scheduledFor = validatedData.isScheduled && validatedData.scheduledFor
      ? new Date(validatedData.scheduledFor)
      : null

    const ride = await prisma.ride.create({
      data: {
        customerId: session.user.id,
        rideNumber,
        rideType: validatedData.rideType,
        pickupAddress: validatedData.pickupAddress,
        pickupLatitude: validatedData.pickupLatitude,
        pickupLongitude: validatedData.pickupLongitude,
        destinationAddress: validatedData.destinationAddress,
        destinationLatitude: validatedData.destinationLatitude,
        destinationLongitude: validatedData.destinationLongitude,
        distance,
        estimatedDuration: duration,
        estimatedFare: fareData.totalFare,
        baseFare: fareData.baseFare,
        distanceFare: fareData.distanceFare,
        timeFare: fareData.timeFare,
        surgeFare: fareData.surgeFare,
        surgeMultiplier: fareData.surgeMultiplier,
        passengers: validatedData.passengers,
        isScheduled: validatedData.isScheduled,
        scheduledFor,
        notes: validatedData.notes,
        status: validatedData.isScheduled ? 'PENDING' : 'PENDING',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          }
        }
      }
    })

    // Create ride request
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    const rideRequest = await prisma.rideRequest.create({
      data: {
        rideId: ride.id,
        customerId: session.user.id,
        pickupAddress: validatedData.pickupAddress,
        pickupLatitude: validatedData.pickupLatitude,
        pickupLongitude: validatedData.pickupLongitude,
        destinationAddress: validatedData.destinationAddress,
        destinationLatitude: validatedData.destinationLatitude,
        destinationLongitude: validatedData.destinationLongitude,
        rideType: validatedData.rideType,
        passengers: validatedData.passengers,
        isScheduled: validatedData.isScheduled,
        scheduledFor,
        notes: validatedData.notes,
        maxFare: validatedData.maxFare,
        preferredDriverId: validatedData.preferredDriverId,
        autoAccept: validatedData.autoAccept,
        minRating: validatedData.minRating,
        allowShared: validatedData.allowShared,
        requireChild: validatedData.requireChild,
        requireWheelchair: validatedData.requireWheelchair,
        expiresAt,
      }
    })

    // Create fare estimate
    await prisma.fareEstimate.create({
      data: {
        rideId: ride.id,
        rideType: validatedData.rideType,
        distance,
        duration,
        baseFare: fareData.baseFare,
        distanceFare: fareData.distanceFare,
        timeFare: fareData.timeFare,
        surgeFare: fareData.surgeFare,
        surgeMultiplier: fareData.surgeMultiplier,
        totalFare: fareData.totalFare,
        fareBreakdown: {
          baseFare: fareData.baseFare,
          distanceFare: fareData.distanceFare,
          timeFare: fareData.timeFare,
          surgeFare: fareData.surgeFare,
          surgeMultiplier: fareData.surgeMultiplier,
          distance,
          duration,
          rideType: validatedData.rideType,
        },
        validUntil: expiresAt,
      }
    })

    // TODO: Trigger driver matching logic
    // This would be handled by a separate service or background job

    return NextResponse.json({
      success: true,
      data: {
        ride,
        rideRequest,
        fareEstimate: fareData,
      }
    })

  } catch (error) {
    console.error('Error creating ride request:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create ride request' },
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
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereClause: any = {
      customerId: session.user.id,
    }

    if (status) {
      whereClause.status = status
    }

    const rides = await prisma.ride.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          }
        },
        driver: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                avatar: true,
              }
            },
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleColor: true,
            vehiclePlate: true,
            rating: true,
            totalRides: true,
          }
        },
        fareEstimate: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit,
    })

    const totalRides = await prisma.ride.count({
      where: whereClause,
    })

    return NextResponse.json({
      success: true,
      data: {
        rides,
        pagination: {
          total: totalRides,
          limit,
          offset,
          pages: Math.ceil(totalRides / limit),
        }
      }
    })

  } catch (error) {
    console.error('Error fetching rides:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rides' },
      { status: 500 }
    )
  }
}
