
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const fareEstimateSchema = z.object({
  pickupLatitude: z.number(),
  pickupLongitude: z.number(),
  destinationLatitude: z.number(),
  destinationLongitude: z.number(),
  rideType: z.enum(['STANDARD', 'PREMIUM', 'SHARED']).default('STANDARD'),
  isScheduled: z.boolean().default(false),
  scheduledFor: z.string().optional(),
})

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

function getSurgeMultiplier(pickupLat: number, pickupLon: number, scheduledFor?: string): number {
  const now = new Date()
  const hour = now.getHours()
  
  // Peak hours: 7-9 AM and 5-7 PM
  const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
  
  // Weekend nights: Friday and Saturday 10 PM - 2 AM
  const isWeekendNight = (now.getDay() === 5 || now.getDay() === 6) && 
                        (hour >= 22 || hour <= 2)
  
  // Bad weather multiplier (simplified)
  const weatherMultiplier = 1.0 // TODO: Integrate with weather API
  
  let surgeMultiplier = 1.0
  
  if (isPeakHour) {
    surgeMultiplier = 1.5
  } else if (isWeekendNight) {
    surgeMultiplier = 1.8
  }
  
  // Apply weather multiplier
  surgeMultiplier *= weatherMultiplier
  
  // Cap at 3.0x
  return Math.min(surgeMultiplier, 3.0)
}

async function calculateFare(
  distance: number, 
  duration: number, 
  rideType: string,
  pickupLat: number,
  pickupLon: number,
  scheduledFor?: string
) {
  // Get ride type pricing
  const rideTypeData = await prisma.rideType.findFirst({
    where: { name: rideType, isActive: true }
  })

  const baseFare = rideTypeData?.baseFare || (rideType === 'PREMIUM' ? 4.99 : rideType === 'SHARED' ? 2.99 : 3.99)
  const perKmRate = rideTypeData?.perKmRate || (rideType === 'PREMIUM' ? 3.50 : rideType === 'SHARED' ? 1.50 : 2.50)
  const perMinuteRate = rideTypeData?.perMinuteRate || (rideType === 'PREMIUM' ? 0.50 : rideType === 'SHARED' ? 0.25 : 0.35)
  const minimumFare = rideTypeData?.minimumFare || (rideType === 'PREMIUM' ? 8.99 : rideType === 'SHARED' ? 4.99 : 6.99)

  // Calculate surge multiplier
  const surgeMultiplier = getSurgeMultiplier(pickupLat, pickupLon, scheduledFor)
  
  const distanceFare = distance * perKmRate
  const timeFare = duration * perMinuteRate
  const subtotal = baseFare + distanceFare + timeFare
  const surgeFare = subtotal * (surgeMultiplier - 1)
  const totalFare = Math.max(subtotal + surgeFare, minimumFare)

  return {
    baseFare,
    distanceFare,
    timeFare,
    surgeFare,
    surgeMultiplier,
    totalFare: Math.round(totalFare * 100) / 100, // Round to 2 decimal places
    minimumFare,
    breakdown: {
      distance: Math.round(distance * 100) / 100,
      duration,
      rideType,
      surgeActive: surgeMultiplier > 1,
      estimatedTime: `${Math.ceil(duration)} minutes`,
      estimatedDistance: `${Math.round(distance * 100) / 100} km`
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = fareEstimateSchema.parse(body)

    // Calculate distance and duration
    const distance = calculateDistance(
      validatedData.pickupLatitude,
      validatedData.pickupLongitude,
      validatedData.destinationLatitude,
      validatedData.destinationLongitude
    )

    const duration = estimateDuration(distance, validatedData.rideType)

    // Calculate fare for different ride types
    const fareEstimates = await Promise.all([
      calculateFare(
        distance, 
        duration, 
        'STANDARD',
        validatedData.pickupLatitude,
        validatedData.pickupLongitude,
        validatedData.scheduledFor
      ),
      calculateFare(
        distance, 
        duration, 
        'PREMIUM',
        validatedData.pickupLatitude,
        validatedData.pickupLongitude,
        validatedData.scheduledFor
      ),
      calculateFare(
        distance, 
        duration, 
        'SHARED',
        validatedData.pickupLatitude,
        validatedData.pickupLongitude,
        validatedData.scheduledFor
      ),
    ])

    const estimates = {
      STANDARD: fareEstimates[0],
      PREMIUM: fareEstimates[1],
      SHARED: fareEstimates[2],
    }

    // Get available drivers for each ride type
    const availableDrivers = await prisma.driver.findMany({
      where: {
        isAvailable: true,
        verificationStatus: 'VERIFIED',
        // TODO: Add location-based filtering
      },
      select: {
        id: true,
        vehicleType: true,
        rating: true,
        totalRides: true,
        currentLatitude: true,
        currentLongitude: true,
      }
    })

    // Calculate ETA for each ride type
    const etaEstimates = {
      STANDARD: availableDrivers.length > 0 ? '3-8 minutes' : 'No drivers available',
      PREMIUM: availableDrivers.filter(d => d.vehicleType === 'LUXURY').length > 0 ? '5-12 minutes' : 'No premium drivers available',
      SHARED: availableDrivers.length > 0 ? '5-15 minutes' : 'No drivers available',
    }

    return NextResponse.json({
      success: true,
      data: {
        estimates,
        etaEstimates,
        availableDrivers: availableDrivers.length,
        distance: Math.round(distance * 100) / 100,
        estimatedDuration: duration,
        validUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      }
    })

  } catch (error) {
    console.error('Error calculating fare estimate:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to calculate fare estimate' },
      { status: 500 }
    )
  }
}
