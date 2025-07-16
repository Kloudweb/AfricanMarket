
// Chat API endpoints
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ChatService } from '@/lib/chat-service'

export const dynamic = 'force-dynamic'

const chatService = new ChatService()

// Get user chat rooms
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rooms = await chatService.getUserChatRooms(session.user.id)
    const unreadCount = await chatService.getUnreadMessageCount(session.user.id)

    return NextResponse.json({ rooms, unreadCount })
  } catch (error) {
    console.error('Error getting chat rooms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create chat room
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, participants, name, orderId, rideId } = await request.json()

    if (!type || !participants || !Array.isArray(participants)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Add current user to participants if not already included
    if (!participants.includes(session.user.id)) {
      participants.push(session.user.id)
    }

    const room = await chatService.createChatRoom({
      type,
      participants,
      name,
      orderId,
      rideId
    })

    return NextResponse.json({ room })
  } catch (error) {
    console.error('Error creating chat room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

