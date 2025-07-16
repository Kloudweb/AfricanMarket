
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ServiceType } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Get driver matching preferences
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      include: {
        matchingPreferences: true,
        workingHoursConfig: true,
        serviceAreas: {
          where: { isActive: true },
          orderBy: { priority: 'desc' }
        }
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        serviceTypes: driver.serviceTypes,
        serviceRadius: driver.serviceRadius,
        preferredAreas: driver.preferredAreas
      },
      preferences: driver.matchingPreferences,
      workingHours: driver.workingHoursConfig,
      serviceAreas: driver.serviceAreas
    })
  } catch (error) {
    console.error('Error getting driver preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update driver matching preferences
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      serviceTypes,
      maxDistance,
      maxOrderValue,
      minOrderValue,
      preferredCuisines,
      avoidCuisines,
      acceptCashOnDelivery,
      acceptLargeOrders,
      acceptBulkOrders,
      acceptScheduledOrders,
      acceptSharedRides,
      acceptLongRides,
      acceptAirportRides,
      maxPassengers,
      preferredAreas,
      avoidAreas,
      workingHours,
      breakDuration,
      maxConsecutiveHours,
      enablePushNotifications,
      enableSmsNotifications,
      enableEmailNotifications,
      notificationSound,
      vibrationEnabled,
      autoAcceptOrders,
      autoAcceptThreshold,
      responseTimeLimit
    } = body

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Validate service types
    if (serviceTypes && Array.isArray(serviceTypes)) {
      const validTypes: ServiceType[] = [ServiceType.FOOD_DELIVERY, ServiceType.RIDESHARE, ServiceType.BOTH]
      const invalidTypes = serviceTypes.filter(type => !validTypes.includes(type))
      if (invalidTypes.length > 0) {
        return NextResponse.json({ error: `Invalid service types: ${invalidTypes.join(', ')}` }, { status: 400 })
      }
    }

    // Update or create preferences
    const preferences = await prisma.driverMatchingPreferences.upsert({
      where: { driverId: driver.id },
      update: {
        serviceTypes: serviceTypes || [],
        maxDistance: maxDistance || 15,
        maxOrderValue,
        minOrderValue,
        preferredCuisines: preferredCuisines || [],
        avoidCuisines: avoidCuisines || [],
        acceptCashOnDelivery: acceptCashOnDelivery ?? true,
        acceptLargeOrders: acceptLargeOrders ?? true,
        acceptBulkOrders: acceptBulkOrders ?? true,
        acceptScheduledOrders: acceptScheduledOrders ?? true,
        acceptSharedRides: acceptSharedRides ?? true,
        acceptLongRides: acceptLongRides ?? true,
        acceptAirportRides: acceptAirportRides ?? true,
        maxPassengers: maxPassengers || 4,
        preferredAreas: preferredAreas || [],
        avoidAreas: avoidAreas || [],
        workingHours,
        breakDuration: breakDuration || 30,
        maxConsecutiveHours: maxConsecutiveHours || 8,
        enablePushNotifications: enablePushNotifications ?? true,
        enableSmsNotifications: enableSmsNotifications ?? true,
        enableEmailNotifications: enableEmailNotifications ?? false,
        notificationSound,
        vibrationEnabled: vibrationEnabled ?? true,
        autoAcceptOrders: autoAcceptOrders ?? false,
        autoAcceptThreshold,
        responseTimeLimit: responseTimeLimit || 30
      },
      create: {
        driverId: driver.id,
        serviceTypes: serviceTypes || ['BOTH'],
        maxDistance: maxDistance || 15,
        maxOrderValue,
        minOrderValue,
        preferredCuisines: preferredCuisines || [],
        avoidCuisines: avoidCuisines || [],
        acceptCashOnDelivery: acceptCashOnDelivery ?? true,
        acceptLargeOrders: acceptLargeOrders ?? true,
        acceptBulkOrders: acceptBulkOrders ?? true,
        acceptScheduledOrders: acceptScheduledOrders ?? true,
        acceptSharedRides: acceptSharedRides ?? true,
        acceptLongRides: acceptLongRides ?? true,
        acceptAirportRides: acceptAirportRides ?? true,
        maxPassengers: maxPassengers || 4,
        preferredAreas: preferredAreas || [],
        avoidAreas: avoidAreas || [],
        workingHours,
        breakDuration: breakDuration || 30,
        maxConsecutiveHours: maxConsecutiveHours || 8,
        enablePushNotifications: enablePushNotifications ?? true,
        enableSmsNotifications: enableSmsNotifications ?? true,
        enableEmailNotifications: enableEmailNotifications ?? false,
        notificationSound,
        vibrationEnabled: vibrationEnabled ?? true,
        autoAcceptOrders: autoAcceptOrders ?? false,
        autoAcceptThreshold,
        responseTimeLimit: responseTimeLimit || 30
      }
    })

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Driver preferences updated successfully'
    })
  } catch (error) {
    console.error('Error updating driver preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
