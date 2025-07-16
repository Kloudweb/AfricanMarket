

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Start navigation session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      orderId,
      rideId,
      startLocation,
      endLocation,
      waypoints,
      routeData,
      estimatedTime,
      distance,
      trafficCondition 
    } = await req.json()

    // Validate required fields
    if (!startLocation || !endLocation) {
      return NextResponse.json({ 
        error: 'Missing required fields: startLocation, endLocation' 
      }, { status: 400 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Generate unique navigation ID
    const navigationId = `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create navigation history record
    const navigationHistory = await prisma.driverNavigationHistory.create({
      data: {
        driverId: driver.id,
        orderId,
        rideId,
        navigationId,
        startLocation,
        endLocation,
        waypoints: waypoints || null,
        routeData: routeData || null,
        distance,
        estimatedTime,
        trafficCondition
      }
    })

    return NextResponse.json({
      message: 'Navigation session started',
      navigationId,
      navigation: navigationHistory
    })
  } catch (error) {
    console.error('Error starting navigation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update navigation session
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      navigationId,
      routeData,
      actualTime,
      completed,
      cancelled 
    } = await req.json()

    if (!navigationId) {
      return NextResponse.json({ 
        error: 'Missing required field: navigationId' 
      }, { status: 400 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const navigation = await prisma.driverNavigationHistory.findFirst({
      where: {
        navigationId,
        driverId: driver.id
      }
    })

    if (!navigation) {
      return NextResponse.json({ error: 'Navigation session not found' }, { status: 404 })
    }

    const updateData: any = {}

    if (routeData) {
      updateData.routeData = routeData
    }

    if (actualTime) {
      updateData.actualTime = actualTime
    }

    if (completed) {
      updateData.completedAt = new Date()
    }

    if (cancelled) {
      updateData.cancelledAt = new Date()
    }

    const updatedNavigation = await prisma.driverNavigationHistory.update({
      where: { id: navigation.id },
      data: updateData
    })

    return NextResponse.json({
      message: 'Navigation session updated',
      navigation: updatedNavigation
    })
  } catch (error) {
    console.error('Error updating navigation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get navigation history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const orderId = searchParams.get('orderId')
    const rideId = searchParams.get('rideId')
    const navigationId = searchParams.get('navigationId')

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const where: any = {
      driverId: driver.id
    }

    if (orderId) {
      where.orderId = orderId
    }

    if (rideId) {
      where.rideId = rideId
    }

    if (navigationId) {
      where.navigationId = navigationId
    }

    const [history, total] = await Promise.all([
      prisma.driverNavigationHistory.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              vendor: {
                select: {
                  businessName: true,
                  address: true
                }
              }
            }
          },
          ride: {
            select: {
              id: true,
              rideNumber: true,
              pickupAddress: true,
              destinationAddress: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.driverNavigationHistory.count({ where })
    ])

    return NextResponse.json({
      history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching navigation history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
