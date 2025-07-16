
// Chat room specific endpoints
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ChatService } from '@/lib/chat-service'

export const dynamic = 'force-dynamic'

const chatService = new ChatService()

// Get chat room messages
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const before = searchParams.get('before') ? new Date(searchParams.get('before')!) : undefined

    const messages = await chatService.getRoomMessages(params.roomId, session.user.id, {
      limit,
      offset,
      before
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error getting room messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Send message to room
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, messageType, mediaUrl, replyToId } = await request.json()

    if (!message && !mediaUrl) {
      return NextResponse.json({ error: 'Message or media required' }, { status: 400 })
    }

    // Handle message via ChatService (which uses WebSocket)
    await chatService.handleMessage({ userId: session.user.id }, {
      roomId: params.roomId,
      message,
      messageType: messageType || 'text',
      mediaUrl,
      replyToId
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

