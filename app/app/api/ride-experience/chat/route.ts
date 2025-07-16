
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RideChatService } from '@/lib/ride-chat-service'
import { RealTimeService } from '@/lib/real-time-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const sendMessageSchema = z.object({
  rideId: z.string(),
  receiverId: z.string(),
  message: z.string().optional(),
  messageType: z.enum(['TEXT', 'IMAGE', 'VOICE', 'LOCATION', 'SYSTEM', 'QUICK_REPLY', 'STICKER', 'DOCUMENT']),
  attachmentUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  voiceDuration: z.number().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  locationAddress: z.string().optional(),
  quickReplyId: z.string().optional(),
})

// Send a chat message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = sendMessageSchema.parse(body)

    const message = await RideChatService.sendMessage({
      ...validatedData,
      senderId: session.user.id,
    })

    // Send real-time message
    RealTimeService.sendChatMessage(validatedData.rideId, message)

    return NextResponse.json({
      success: true,
      data: message
    })

  } catch (error) {
    console.error('Error sending chat message:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

// Get chat messages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rideId = searchParams.get('rideId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!rideId) {
      return NextResponse.json({ error: 'rideId is required' }, { status: 400 })
    }

    const messages = await RideChatService.getChatMessages(rideId, session.user.id, limit, offset)

    return NextResponse.json({
      success: true,
      data: messages
    })

  } catch (error) {
    console.error('Error getting chat messages:', error)
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    )
  }
}
