
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CommunicationService } from '@/lib/communication-service'
import { RealTimeService } from '@/lib/real-time-service'
import { NotificationService } from '@/lib/notification-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateCallStatusSchema = z.object({
  status: z.enum(['ANSWERED', 'ENDED', 'DECLINED', 'MISSED']),
})

interface Props {
  params: { id: string }
}

// Update call status
export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateCallStatusSchema.parse(body)

    const call = await CommunicationService.updateCallStatus(
      params.id,
      validatedData.status,
      session.user.id
    )

    // Send real-time call event
    const otherUserId = call.callerId === session.user.id ? call.calleeId : call.callerId
    RealTimeService.sendCallEvent(otherUserId, `call_${validatedData.status.toLowerCase()}`, call)

    // Send notification
    await NotificationService.sendCallNotification(call.id, validatedData.status)

    return NextResponse.json({
      success: true,
      data: call
    })

  } catch (error) {
    console.error('Error updating call status:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update call status' },
      { status: 500 }
    )
  }
}
