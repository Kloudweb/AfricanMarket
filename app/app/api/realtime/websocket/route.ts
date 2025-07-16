
// WebSocket connection endpoint
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { webSocketService } from '@/lib/comprehensive-websocket-service'

export const dynamic = 'force-dynamic'

// Get WebSocket connection info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = webSocketService.getConnectionStats()
    const isOnline = webSocketService.isUserOnline(session.user.id)

    return NextResponse.json({
      isOnline,
      stats,
      wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001'
    })
  } catch (error) {
    console.error('Error getting WebSocket info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update WebSocket connection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, data } = await request.json()

    switch (action) {
      case 'heartbeat':
        // User heartbeat - handled by WebSocket service
        return NextResponse.json({ success: true })
      
      case 'join_room':
        // Handle room joining via HTTP (fallback)
        return NextResponse.json({ success: true })
      
      case 'leave_room':
        // Handle room leaving via HTTP (fallback)
        return NextResponse.json({ success: true })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating WebSocket connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

