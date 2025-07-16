
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { ChatService } from '@/lib/chat-service'
import { authOptions } from '@/lib/auth'

const createRoomSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isGroup: z.boolean().default(false),
  participants: z.array(z.string()).min(1)
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, isGroup, participants } = createRoomSchema.parse(body)

    const room = await ChatService.createRoom(
      session.user.id,
      name,
      description,
      isGroup,
      participants
    )

    return NextResponse.json(room)
  } catch (error) {
    console.error('Error creating chat room:', error)
    return NextResponse.json(
      { error: 'Failed to create chat room' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')

    const rooms = await ChatService.getUserRooms(
      session.user.id,
      page,
      limit
    )

    return NextResponse.json(rooms)
  } catch (error) {
    console.error('Error getting chat rooms:', error)
    return NextResponse.json(
      { error: 'Failed to get chat rooms' },
      { status: 500 }
    )
  }
}
