
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CommunicationService } from '@/lib/communication-service'
import { RealTimeService } from '@/lib/real-time-service'
import { NotificationService } from '@/lib/notification-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const initiateCallSchema = z.object({
  rideId: z.string(),
  calleeId: z.string(),
  callType: z.enum(['VOICE', 'VIDEO']),
})

// Initiate call
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = initiateCallSchema.parse(body)

    const call = await CommunicationService.initiateCall({
      ...validatedData,
      callerId: session.user.id,
    })

    // Send real-time call event
    RealTimeService.sendCallEvent(validatedData.calleeId, 'incoming_call', call)

    // Send notification
    await NotificationService.sendCallNotification(call.id, 'INITIATED')

    return NextResponse.json({
      success: true,
      data: call
    })

  } catch (error) {
    console.error('Error initiating call:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to initiate call' },
      { status: 500 }
    )
  }
}

// Get call history
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

    const calls = await CommunicationService.getCallHistory(rideId, session.user.id)

    return NextResponse.json({
      success: true,
      data: calls
    })

  } catch (error) {
    console.error('Error getting call history:', error)
    return NextResponse.json(
      { error: 'Failed to get call history' },
      { status: 500 }
    )
  }
}
