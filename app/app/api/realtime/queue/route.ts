
// Message queue API
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { MessageQueueService } from '@/lib/message-queue-service'

export const dynamic = 'force-dynamic'

const queueService = new MessageQueueService()

// Get queue statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await queueService.getQueueStats()

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error getting queue stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add message to queue
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { queueName, messageType, payload, priority, processAt } = await request.json()

    if (!queueName || !messageType || !payload) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await queueService.enqueue(queueName, messageType, payload, {
      priority,
      processAt: processAt ? new Date(processAt) : undefined
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding message to queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

