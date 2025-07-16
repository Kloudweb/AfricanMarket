
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SafetyService } from '@/lib/safety-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const reportIncidentSchema = z.object({
  rideId: z.string(),
  incidentType: z.enum(['ACCIDENT', 'HARASSMENT', 'UNSAFE_DRIVING', 'ROUTE_DEVIATION', 'UNAUTHORIZED_STOP', 'VEHICLE_BREAKDOWN', 'CUSTOMER_COMPLAINT', 'DRIVER_COMPLAINT', 'EMERGENCY_SITUATION']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  photos: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  audioRecording: z.string().optional(),
})

// Report safety incident
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = reportIncidentSchema.parse(body)

    const incident = await SafetyService.reportSafetyIncident({
      ...validatedData,
      reportedBy: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: incident
    })

  } catch (error) {
    console.error('Error reporting safety incident:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to report safety incident' },
      { status: 500 }
    )
  }
}

// Get safety incidents for a ride
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

    const incidents = await SafetyService.getSafetyIncidents(rideId, session.user.id)

    return NextResponse.json({
      success: true,
      data: incidents
    })

  } catch (error) {
    console.error('Error getting safety incidents:', error)
    return NextResponse.json(
      { error: 'Failed to get safety incidents' },
      { status: 500 }
    )
  }
}
