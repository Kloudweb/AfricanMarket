
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { matchingService } from '@/lib/matching-service'
import { MatchingRequest } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Find matching drivers for a request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      orderId,
      rideId,
      type,
      pickupLocation,
      destinationLocation,
      serviceType,
      estimatedValue,
      priority,
      preferredDriverId,
      requirements,
      scheduledFor,
      customerPreferences
    } = body

    // Validate required fields
    if (!orderId && !rideId) {
      return NextResponse.json({ error: 'Order ID or Ride ID is required' }, { status: 400 })
    }

    if (!type || !pickupLocation || !serviceType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create matching request
    const matchingRequest: MatchingRequest = {
      id: orderId || rideId,
      type,
      pickupLocation,
      destinationLocation,
      serviceType,
      estimatedValue,
      priority,
      preferredDriverId,
      requirements,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      customerPreferences
    }

    // Find matches
    const result = await matchingService.findMatches(matchingRequest)

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error,
        algorithm: result.algorithm 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      matches: result.matches,
      estimatedWaitTime: result.estimatedWaitTime,
      algorithm: result.algorithm
    })
  } catch (error) {
    console.error('Error finding drivers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get available drivers in area
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const latitude = parseFloat(searchParams.get('latitude') || '0')
    const longitude = parseFloat(searchParams.get('longitude') || '0')
    const radius = parseInt(searchParams.get('radius') || '10')
    const serviceType = searchParams.get('serviceType') || 'BOTH'

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 })
    }

    // Create a simple matching request for finding available drivers
    const matchingRequest: MatchingRequest = {
      id: 'availability-check',
      type: 'ORDER',
      pickupLocation: { latitude, longitude },
      serviceType: serviceType as any,
      requirements: { maxDistance: radius }
    }

    const result = await matchingService.findMatches(matchingRequest)

    return NextResponse.json({
      success: true,
      availableDrivers: result.matches.length,
      drivers: result.matches.map(match => ({
        driverId: match.driverId,
        distance: match.distance,
        eta: match.eta,
        rating: match.driver.rating,
        vehicleType: match.driver.vehicleType,
        totalScore: match.totalScore
      }))
    })
  } catch (error) {
    console.error('Error getting available drivers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
