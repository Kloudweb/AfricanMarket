
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { ChatService } from '@/lib/chat-service'
import { authOptions } from '@/lib/auth'

const messageSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'file']).optional().default('text'),
  metadata: z.object({}).passthrough().optional()
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
    const { content, type, metadata } = messageSchema.parse(body)

    const message = await ChatService.sendMessage(
      params.roomId,
      session.user.id,
      content,
      type,
      metadata
    )

    return NextResponse.json(message)
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
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

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    const messages = await ChatService.getMessages(
      params.roomId,
      session.user.id,
      page,
      limit
    )

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error getting messages:', error)
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    )
  }
}
