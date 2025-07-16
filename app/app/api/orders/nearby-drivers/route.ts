
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get nearby drivers for an order
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')
    const latitude = parseFloat(searchParams.get('latitude') || '0')
    const longitude = parseFloat(searchParams.get('longitude') || '0')
    const radius = parseInt(searchParams.get('radius') || '10')

    if (!orderId && (!latitude || !longitude)) {
      return NextResponse.json({ error: 'Order ID or coordinates required' }, { status: 400 })
    }

    let searchLatitude = latitude
    let searchLongitude = longitude

    // If order ID is provided, get order location
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          vendor: {
            select: {
              latitude: true,
              longitude: true
            }
          }
        }
      })

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      searchLatitude = order.vendor?.latitude || latitude
      searchLongitude = order.vendor?.longitude || longitude
    }

    // Find nearby drivers
    const drivers = await prisma.driver.findMany({
      where: {
        isAvailable: true,
        verificationStatus: 'VERIFIED'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        locations: {
          where: { isOnline: true },
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    })

    // Calculate distances and filter by radius
    const nearbyDrivers = drivers
      .filter(driver => driver.locations.length > 0)
      .map(driver => {
        const location = driver.locations[0]
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          searchLatitude,
          searchLongitude
        )

        return {
          driver: {
            id: driver.id,
            user: driver.user,
            vehicleType: driver.vehicleType,
            vehicleMake: driver.vehicleMake,
            vehicleModel: driver.vehicleModel,
            vehicleColor: driver.vehicleColor,
            vehiclePlate: driver.vehiclePlate,
            rating: driver.rating,
            totalDeliveries: driver.totalDeliveries
          },
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: location.timestamp,
            isDelivering: location.isDelivering
          },
          distance,
          eta: Math.ceil(distance / 0.5) // Assume 30 km/h average speed
        }
      })
      .filter(item => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    return NextResponse.json({
      drivers: nearbyDrivers,
      searchLocation: {
        latitude: searchLatitude,
        longitude: searchLongitude
      },
      radius
    })
  } catch (error) {
    console.error('Error fetching nearby drivers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Simple distance calculation function
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
