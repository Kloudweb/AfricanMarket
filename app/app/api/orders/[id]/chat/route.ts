
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get order chat messages
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = params.id

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendor: true,
        driver: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user has access to this order chat
    const hasAccess = order.customerId === session.user.id || 
                     order.vendor?.userId === session.user.id ||
                     order.driver?.userId === session.user.id

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const messages = await prisma.orderChat.findMany({
      where: { orderId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Mark messages as read for current user
    await prisma.orderChat.updateMany({
      where: {
        orderId,
        senderId: { not: session.user.id },
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching order chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Send message in order chat
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = params.id
    const { message, messageType = 'text', metadata } = await req.json()

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendor: true,
        driver: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user has access to this order chat
    const hasAccess = order.customerId === session.user.id || 
                     order.vendor?.userId === session.user.id ||
                     order.driver?.userId === session.user.id

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create message
    const chatMessage = await prisma.orderChat.create({
      data: {
        orderId,
        senderId: session.user.id,
        senderRole: session.user.role,
        message,
        messageType,
        metadata
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        }
      }
    })

    // TODO: Send real-time notification to other participants

    return NextResponse.json({
      message: 'Message sent successfully',
      chatMessage
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
