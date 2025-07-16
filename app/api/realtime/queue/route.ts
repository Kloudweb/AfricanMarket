
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { MessageQueueService } from '@/lib/message-queue-service'
import { authOptions } from '@/lib/auth'

const queueMessageSchema = z.object({
  type: z.enum(['order_status', 'inventory_update', 'pricing_update']),
  payload: z.object({}).passthrough(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  delaySeconds: z.number().min(0).default(0)
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role for queue management
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { type, payload, priority, delaySeconds } = queueMessageSchema.parse(body)

    const result = await MessageQueueService.addMessage(
      type,
      payload,
      priority,
      delaySeconds
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error adding message to queue:', error)
    return NextResponse.json(
      { error: 'Failed to add message to queue' },
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

    // Check if user has admin role for queue management
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const type = url.searchParams.get('type')

    const messages = await MessageQueueService.getMessages(status ?? undefined, type ?? undefined)
    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error getting queue messages:', error)
    return NextResponse.json(
      { error: 'Failed to get queue messages' },
      { status: 500 }
    )
  }
}
