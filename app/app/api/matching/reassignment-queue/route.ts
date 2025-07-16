
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { matchingService } from '@/lib/matching-service'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Process reassignment queue
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Process reassignment queue
    await matchingService.processReassignmentQueue()

    return NextResponse.json({
      success: true,
      message: 'Reassignment queue processed successfully'
    })
  } catch (error) {
    console.error('Error processing reassignment queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get reassignment queue status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')

    // Get queue items
    const queueItems = await prisma.reassignmentQueue.findMany({
      where: status ? { status } : {},
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            vendor: {
              select: {
                businessName: true
              }
            }
          }
        },
        ride: {
          select: {
            id: true,
            rideNumber: true,
            estimatedFare: true,
            pickupAddress: true,
            destinationAddress: true
          }
        }
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit
    })

    // Get queue statistics
    const stats = await prisma.reassignmentQueue.groupBy({
      by: ['status'],
      _count: { id: true }
    })

    const statistics = {
      total: stats.reduce((sum, item) => sum + item._count.id, 0),
      pending: stats.find(s => s.status === 'PENDING')?._count.id || 0,
      processing: stats.find(s => s.status === 'PROCESSING')?._count.id || 0,
      completed: stats.find(s => s.status === 'COMPLETED')?._count.id || 0,
      failed: stats.find(s => s.status === 'FAILED')?._count.id || 0
    }

    return NextResponse.json({
      success: true,
      queueItems,
      statistics
    })
  } catch (error) {
    console.error('Error getting reassignment queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
