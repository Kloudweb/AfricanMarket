

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get driver settings
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      include: {
        driverSettings: true
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Return settings or default values
    const settings = driver.driverSettings || {
      enablePushNotifications: true,
      enableSoundAlerts: true,
      enableVibration: true,
      notificationRadius: 5,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      autoAcceptRequests: false,
      acceptanceTimeLimit: 30,
      minOrderValue: 0,
      maxDeliveryDistance: 20,
      preferredOrderTypes: [],
      preferredMapProvider: 'GOOGLE',
      avoidTolls: false,
      avoidHighways: false,
      voiceNavigationEnabled: true,
      dailyEarningsGoal: 0,
      weeklyEarningsGoal: 0,
      monthlyEarningsGoal: 0,
      dailyDeliveryGoal: 0,
      weeklyDeliveryGoal: 0,
      shareLocationWithCustomer: true,
      shareETAWithCustomer: true,
      allowCustomerCalls: true,
      allowCustomerMessages: true
    }

    return NextResponse.json({
      settings,
      driver: {
        id: driver.id,
        availabilityMode: driver.availabilityMode,
        maxDailyHours: driver.maxDailyHours,
        maxWeeklyHours: driver.maxWeeklyHours,
        breakDuration: driver.breakDuration,
        availabilitySchedule: driver.availabilitySchedule
      }
    })
  } catch (error) {
    console.error('Error fetching driver settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update driver settings
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await req.json()

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Validate settings
    const validatedSettings: any = {}

    // Notification preferences
    if (typeof settings.enablePushNotifications === 'boolean') {
      validatedSettings.enablePushNotifications = settings.enablePushNotifications
    }
    if (typeof settings.enableSoundAlerts === 'boolean') {
      validatedSettings.enableSoundAlerts = settings.enableSoundAlerts
    }
    if (typeof settings.enableVibration === 'boolean') {
      validatedSettings.enableVibration = settings.enableVibration
    }
    if (typeof settings.notificationRadius === 'number' && settings.notificationRadius > 0) {
      validatedSettings.notificationRadius = settings.notificationRadius
    }
    if (typeof settings.quietHoursEnabled === 'boolean') {
      validatedSettings.quietHoursEnabled = settings.quietHoursEnabled
    }
    if (typeof settings.quietHoursStart === 'string') {
      validatedSettings.quietHoursStart = settings.quietHoursStart
    }
    if (typeof settings.quietHoursEnd === 'string') {
      validatedSettings.quietHoursEnd = settings.quietHoursEnd
    }

    // Request preferences
    if (typeof settings.autoAcceptRequests === 'boolean') {
      validatedSettings.autoAcceptRequests = settings.autoAcceptRequests
    }
    if (typeof settings.acceptanceTimeLimit === 'number' && settings.acceptanceTimeLimit > 0) {
      validatedSettings.acceptanceTimeLimit = settings.acceptanceTimeLimit
    }
    if (typeof settings.minOrderValue === 'number' && settings.minOrderValue >= 0) {
      validatedSettings.minOrderValue = settings.minOrderValue
    }
    if (typeof settings.maxDeliveryDistance === 'number' && settings.maxDeliveryDistance > 0) {
      validatedSettings.maxDeliveryDistance = settings.maxDeliveryDistance
    }
    if (Array.isArray(settings.preferredOrderTypes)) {
      validatedSettings.preferredOrderTypes = settings.preferredOrderTypes
    }

    // Navigation preferences
    if (['GOOGLE', 'APPLE', 'WAZE'].includes(settings.preferredMapProvider)) {
      validatedSettings.preferredMapProvider = settings.preferredMapProvider
    }
    if (typeof settings.avoidTolls === 'boolean') {
      validatedSettings.avoidTolls = settings.avoidTolls
    }
    if (typeof settings.avoidHighways === 'boolean') {
      validatedSettings.avoidHighways = settings.avoidHighways
    }
    if (typeof settings.voiceNavigationEnabled === 'boolean') {
      validatedSettings.voiceNavigationEnabled = settings.voiceNavigationEnabled
    }

    // Performance goals
    if (typeof settings.dailyEarningsGoal === 'number' && settings.dailyEarningsGoal >= 0) {
      validatedSettings.dailyEarningsGoal = settings.dailyEarningsGoal
    }
    if (typeof settings.weeklyEarningsGoal === 'number' && settings.weeklyEarningsGoal >= 0) {
      validatedSettings.weeklyEarningsGoal = settings.weeklyEarningsGoal
    }
    if (typeof settings.monthlyEarningsGoal === 'number' && settings.monthlyEarningsGoal >= 0) {
      validatedSettings.monthlyEarningsGoal = settings.monthlyEarningsGoal
    }
    if (typeof settings.dailyDeliveryGoal === 'number' && settings.dailyDeliveryGoal >= 0) {
      validatedSettings.dailyDeliveryGoal = settings.dailyDeliveryGoal
    }
    if (typeof settings.weeklyDeliveryGoal === 'number' && settings.weeklyDeliveryGoal >= 0) {
      validatedSettings.weeklyDeliveryGoal = settings.weeklyDeliveryGoal
    }

    // Privacy settings
    if (typeof settings.shareLocationWithCustomer === 'boolean') {
      validatedSettings.shareLocationWithCustomer = settings.shareLocationWithCustomer
    }
    if (typeof settings.shareETAWithCustomer === 'boolean') {
      validatedSettings.shareETAWithCustomer = settings.shareETAWithCustomer
    }
    if (typeof settings.allowCustomerCalls === 'boolean') {
      validatedSettings.allowCustomerCalls = settings.allowCustomerCalls
    }
    if (typeof settings.allowCustomerMessages === 'boolean') {
      validatedSettings.allowCustomerMessages = settings.allowCustomerMessages
    }

    // Update or create driver settings
    const updatedSettings = await prisma.driverSettings.upsert({
      where: { driverId: driver.id },
      update: validatedSettings,
      create: {
        driverId: driver.id,
        ...validatedSettings
      }
    })

    // Update driver availability settings if provided
    const driverUpdates: any = {}
    if (typeof settings.maxDailyHours === 'number' && settings.maxDailyHours > 0) {
      driverUpdates.maxDailyHours = settings.maxDailyHours
    }
    if (typeof settings.maxWeeklyHours === 'number' && settings.maxWeeklyHours > 0) {
      driverUpdates.maxWeeklyHours = settings.maxWeeklyHours
    }
    if (typeof settings.breakDuration === 'number' && settings.breakDuration > 0) {
      driverUpdates.breakDuration = settings.breakDuration
    }
    if (settings.availabilitySchedule) {
      driverUpdates.availabilitySchedule = settings.availabilitySchedule
    }

    if (Object.keys(driverUpdates).length > 0) {
      await prisma.driver.update({
        where: { id: driver.id },
        data: driverUpdates
      })
    }

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: updatedSettings
    })
  } catch (error) {
    console.error('Error updating driver settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
