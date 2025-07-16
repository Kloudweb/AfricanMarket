
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { ChatService } from '@/lib/chat-service'
import { authOptions } from '@/lib/auth'

const readMessagesSchema = z.object({
  messageIds: z.array(z.string())
})

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { messageIds } = readMessagesSchema.parse(body)

    const result = await ChatService.markMessagesAsRead(
      params.roomId,
      session.user.id,
      messageIds
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const unreadCount = await ChatService.getUnreadMessagesCount(
      params.roomId,
      session.user.id
    )

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error('Error getting unread count:', error)
    return NextResponse.json(
      { error: 'Failed to get unread count' },
      { status: 500 }
    )
  }
}
