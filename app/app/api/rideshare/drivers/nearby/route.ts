
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const nearbyDriversSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number().min(1).max(50).default(10), // km
  rideType: z.enum(['STANDARD', 'PREMIUM', 'SHARED']).optional(),
  minRating: z.number().min(1).max(5).optional(),
  limit: z.number().min(1).max(20).default(10),
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

function estimateArrivalTime(distance: number): number {
  const avgSpeed = 40 // km/h in city
  const timeInHours = distance / avgSpeed
  return Math.ceil(timeInHours * 60) // Convert to minutes
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = nearbyDriversSchema.parse(body)

    // Get drivers with current location
    const drivers = await prisma.driver.findMany({
      where: {
        isAvailable: true,
        verificationStatus: 'VERIFIED',
        currentLatitude: { not: null },
        currentLongitude: { not: null },
        rating: validatedData.minRating ? { gte: validatedData.minRating } : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
          }
        },
        locations: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        },
        driverPreferences: true,
      }
    })

    // Filter by distance and calculate additional info
    const nearbyDrivers = drivers
      .map(driver => {
        const distance = calculateDistance(
          validatedData.latitude,
          validatedData.longitude,
          driver.currentLatitude!,
          driver.currentLongitude!
        )

        const eta = estimateArrivalTime(distance)
        const lastLocation = driver.locations?.[0]

        return {
          ...driver,
          distance: Math.round(distance * 100) / 100,
          eta,
          lastLocationUpdate: lastLocation?.timestamp || driver.updatedAt,
          isOnline: lastLocation?.isOnline || false,
          heading: lastLocation?.heading,
          speed: lastLocation?.speed,
          accuracy: lastLocation?.accuracy,
        }
      })
      .filter(driver => driver.distance <= validatedData.radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, validatedData.limit)

    // Filter by ride type compatibility
    const compatibleDrivers = nearbyDrivers.filter(driver => {
      if (!validatedData.rideType) return true
      
      const preferences = driver.driverPreferences
      if (!preferences?.rideTypes) return true
      
      return preferences.rideTypes.includes(validatedData.rideType)
    })

    // Format response
    const formattedDrivers = compatibleDrivers.map(driver => ({
      id: driver.id,
      user: driver.user,
      vehicleType: driver.vehicleType,
      vehicleMake: driver.vehicleMake,
      vehicleModel: driver.vehicleModel,
      vehicleYear: driver.vehicleYear,
      vehicleColor: driver.vehicleColor,
      vehiclePlate: driver.vehiclePlate,
      rating: driver.rating,
      totalRides: driver.totalRides,
      totalDeliveries: driver.totalDeliveries,
      distance: driver.distance,
      eta: driver.eta,
      etaText: `${driver.eta} min${driver.eta !== 1 ? 's' : ''}`,
      currentLatitude: driver.currentLatitude,
      currentLongitude: driver.currentLongitude,
      heading: driver.heading,
      speed: driver.speed,
      isOnline: driver.isOnline,
      lastLocationUpdate: driver.lastLocationUpdate,
      serviceTypes: driver.serviceTypes,
      preferences: driver.driverPreferences ? {
        rideTypes: driver.driverPreferences.rideTypes,
        maxDistance: driver.driverPreferences.maxDistance,
        allowPets: driver.driverPreferences.allowPets,
        allowSmoking: driver.driverPreferences.allowSmoking,
        allowFood: driver.driverPreferences.allowFood,
      } : null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        drivers: formattedDrivers,
        totalFound: formattedDrivers.length,
        searchRadius: validatedData.radius,
        searchCenter: {
          latitude: validatedData.latitude,
          longitude: validatedData.longitude,
        },
        filters: {
          rideType: validatedData.rideType,
          minRating: validatedData.minRating,
        }
      }
    })

  } catch (error) {
    console.error('Error finding nearby drivers:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to find nearby drivers' },
      { status: 500 }
    )
  }
}
