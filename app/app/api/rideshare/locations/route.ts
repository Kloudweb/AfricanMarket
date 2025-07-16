
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const saveLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  address: z.string().min(1, 'Address is required'),
  latitude: z.number(),
  longitude: z.number(),
  type: z.enum(['HOME', 'WORK', 'FAVORITE']).default('FAVORITE'),
  apartment: z.string().optional(),
  notes: z.string().optional(),
  isDefault: z.boolean().default(false),
})

const geocodeSchema = z.object({
  address: z.string().min(1, 'Address is required'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = saveLocationSchema.parse(body)

    // If setting as default, unset other defaults of the same type
    if (validatedData.isDefault) {
      await prisma.savedLocation.updateMany({
        where: {
          userId: session.user.id,
          type: validatedData.type,
          isDefault: true,
        },
        data: {
          isDefault: false,
        }
      })
    }

    // Check if location already exists
    const existingLocation = await prisma.savedLocation.findFirst({
      where: {
        userId: session.user.id,
        name: validatedData.name,
        type: validatedData.type,
      }
    })

    if (existingLocation) {
      // Update existing location
      const updatedLocation = await prisma.savedLocation.update({
        where: { id: existingLocation.id },
        data: {
          address: validatedData.address,
          latitude: validatedData.latitude,
          longitude: validatedData.longitude,
          apartment: validatedData.apartment,
          notes: validatedData.notes,
          isDefault: validatedData.isDefault,
          updatedAt: new Date(),
        }
      })

      return NextResponse.json({
        success: true,
        data: updatedLocation
      })
    } else {
      // Create new location
      const savedLocation = await prisma.savedLocation.create({
        data: {
          userId: session.user.id,
          name: validatedData.name,
          address: validatedData.address,
          latitude: validatedData.latitude,
          longitude: validatedData.longitude,
          type: validatedData.type,
          apartment: validatedData.apartment,
          notes: validatedData.notes,
          isDefault: validatedData.isDefault,
          usageCount: 0,
        }
      })

      return NextResponse.json({
        success: true,
        data: savedLocation
      })
    }

  } catch (error) {
    console.error('Error saving location:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to save location' },
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
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '20')

    const whereClause: any = {
      userId: session.user.id,
    }

    if (type) {
      whereClause.type = type
    }

    const locations = await prisma.savedLocation.findMany({
      where: whereClause,
      orderBy: [
        { isDefault: 'desc' },
        { usageCount: 'desc' },
        { lastUsed: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    })

    // Also get recent locations from ride history
    const recentRides = await prisma.ride.findMany({
      where: {
        customerId: session.user.id,
        status: 'COMPLETED',
      },
      select: {
        pickupAddress: true,
        pickupLatitude: true,
        pickupLongitude: true,
        destinationAddress: true,
        destinationLatitude: true,
        destinationLongitude: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
    })

    // Extract unique recent locations
    const recentLocations = new Map()
    recentRides.forEach(ride => {
      if (!recentLocations.has(ride.pickupAddress)) {
        recentLocations.set(ride.pickupAddress, {
          type: 'RECENT',
          name: 'Recent pickup',
          address: ride.pickupAddress,
          latitude: ride.pickupLatitude,
          longitude: ride.pickupLongitude,
          lastUsed: ride.createdAt,
        })
      }
      if (!recentLocations.has(ride.destinationAddress)) {
        recentLocations.set(ride.destinationAddress, {
          type: 'RECENT',
          name: 'Recent destination',
          address: ride.destinationAddress,
          latitude: ride.destinationLatitude,
          longitude: ride.destinationLongitude,
          lastUsed: ride.createdAt,
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        savedLocations: locations,
        recentLocations: Array.from(recentLocations.values()).slice(0, 5),
      }
    })

  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}

// Geocoding endpoint
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = geocodeSchema.parse(body)

    // TODO: Implement actual geocoding service (Google Maps API)
    // For now, return mock data
    const mockResults = [
      {
        address: validatedData.address,
        formattedAddress: `${validatedData.address}, St. John's, NL, Canada`,
        latitude: 47.5615 + (Math.random() - 0.5) * 0.1,
        longitude: -52.7126 + (Math.random() - 0.5) * 0.1,
        placeId: 'mock_place_id_' + Math.random().toString(36).substr(2, 9),
        types: ['street_address'],
        components: {
          streetNumber: '123',
          route: 'Main Street',
          locality: 'St. John\'s',
          administrativeAreaLevel1: 'Newfoundland and Labrador',
          country: 'Canada',
          postalCode: 'A1A 1A1',
        }
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        results: mockResults,
        query: validatedData.address,
      }
    })

  } catch (error) {
    console.error('Error geocoding address:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to geocode address' },
      { status: 500 }
    )
  }
}
