
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SafetyService } from '@/lib/safety-service'
import { RealTimeService } from '@/lib/real-time-service'
import { NotificationService } from '@/lib/notification-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const triggerAlertSchema = z.object({
  rideId: z.string(),
  alertType: z.enum(['PANIC_BUTTON', 'ROUTE_DEVIATION', 'SPEED_VIOLATION', 'UNUSUAL_STOP', 'EMERGENCY_CONTACT', 'DRIVER_DISTRESS', 'PASSENGER_DISTRESS', 'AUTOMATIC_DETECTION']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  message: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  hasRecording: z.boolean().optional(),
  recordingUrl: z.string().optional(),
  recordingDuration: z.number().optional(),
})

// Trigger safety alert
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = triggerAlertSchema.parse(body)

    const alert = await SafetyService.triggerSafetyAlert({
      ...validatedData,
      triggeredBy: session.user.id,
    })

    // Send real-time safety alert
    RealTimeService.sendSafetyAlert(validatedData.rideId, alert)

    // Send notification
    await NotificationService.sendSafetyAlertNotification(alert.id)

    return NextResponse.json({
      success: true,
      data: alert
    })

  } catch (error) {
    console.error('Error triggering safety alert:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to trigger safety alert' },
      { status: 500 }
    )
  }
}

// Get safety alerts for a ride
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rideId = searchParams.get('rideId')

    if (!rideId) {
      return NextResponse.json({ error: 'rideId is required' }, { status: 400 })
    }

    const alerts = await SafetyService.getSafetyAlerts(rideId, session.user.id)

    return NextResponse.json({
      success: true,
      data: alerts
    })

  } catch (error) {
    console.error('Error getting safety alerts:', error)
    return NextResponse.json(
      { error: 'Failed to get safety alerts' },
      { status: 500 }
    )
  }
}
