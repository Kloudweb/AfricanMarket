
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ComprehensiveWebSocketService } from '@/lib/comprehensive-websocket-service'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get WebSocket connection info
    const connections = await ComprehensiveWebSocketService.getActiveConnections()
    const userConnections = connections.filter(conn => conn.userId === session.user.id)

    return NextResponse.json({
      connections: userConnections,
      totalConnections: connections.length
    })
  } catch (error) {
    console.error('Error getting WebSocket info:', error)
    return NextResponse.json(
      { error: 'Failed to get WebSocket info' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'broadcast':
        // Only admins can broadcast
        if (session.user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        await ComprehensiveWebSocketService.broadcastToAll(data.event, data.payload)
        break
      case 'send_to_user':
        await ComprehensiveWebSocketService.sendToUser(data.userId, data.event, data.payload)
        break
      case 'send_to_room':
        await ComprehensiveWebSocketService.sendToRoom(data.room, data.event, data.payload)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling WebSocket action:', error)
    return NextResponse.json(
      { error: 'Failed to handle WebSocket action' },
      { status: 500 }
    )
  }
}
