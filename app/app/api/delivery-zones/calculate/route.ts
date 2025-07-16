
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Calculate delivery fee
export async function POST(req: NextRequest) {
  try {
    const { vendorId, customerLatitude, customerLongitude, subtotal } = await req.json()

    if (!vendorId || !customerLatitude || !customerLongitude) {
      return NextResponse.json({ 
        error: 'Vendor ID and customer coordinates are required' 
      }, { status: 400 })
    }

    // Get vendor details
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        deliveryFee: true,
        minimumOrderAmount: true,
        latitude: true,
        longitude: true
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Default delivery fee if no coordinates available
    if (!vendor.latitude || !vendor.longitude) {
      const baseFee = vendor.deliveryFee || 5.99
      const isFree = vendor.minimumOrderAmount && subtotal >= vendor.minimumOrderAmount
      
      return NextResponse.json({
        deliveryFee: isFree ? 0 : baseFee,
        distance: null,
        zone: null,
        freeDeliveryThreshold: vendor.minimumOrderAmount
      })
    }

    // Calculate distance
    const distance = calculateDistance(
      vendor.latitude,
      vendor.longitude,
      customerLatitude,
      customerLongitude
    )

    // Check delivery zones
    const deliveryZones = await prisma.deliveryZone.findMany({
      where: {
        vendorId: vendorId,
        isActive: true
      },
      orderBy: {
        baseFee: 'asc'
      }
    })

    let deliveryFee = vendor.deliveryFee || 5.99
    let matchedZone = null

    for (const zone of deliveryZones) {
      if (distance <= (zone.maxDistance || 50)) {
        deliveryFee = zone.baseFee
        if (zone.feePerKm) {
          deliveryFee += distance * zone.feePerKm
        }
        matchedZone = zone
        break
      }
    }

    // If no zone matched, use default calculation
    if (!matchedZone) {
      const baseFee = vendor.deliveryFee || 5.99
      const distanceFee = distance * 0.50 // $0.50 per km
      deliveryFee = baseFee + distanceFee
    }

    // Check for free delivery
    const isFree = (vendor.minimumOrderAmount && subtotal >= vendor.minimumOrderAmount) ||
                   (matchedZone?.minimumOrder && subtotal >= matchedZone.minimumOrder)

    return NextResponse.json({
      deliveryFee: isFree ? 0 : deliveryFee,
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      zone: matchedZone,
      freeDeliveryThreshold: vendor.minimumOrderAmount || matchedZone?.minimumOrder,
      estimatedTime: matchedZone?.estimatedTime || '30-45 minutes'
    })
  } catch (error) {
    console.error('Error calculating delivery fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
