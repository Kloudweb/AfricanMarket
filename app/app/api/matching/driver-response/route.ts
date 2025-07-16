
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { matchingService } from '@/lib/matching-service'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Handle driver response to assignment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { assignmentId, response, rejectionReason } = body

    if (!assignmentId || !response) {
      return NextResponse.json({ error: 'Assignment ID and response are required' }, { status: 400 })
    }

    if (!['ACCEPTED', 'REJECTED'].includes(response)) {
      return NextResponse.json({ error: 'Invalid response type' }, { status: 400 })
    }

    // Get driver profile
    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Handle driver response
    const result = await matchingService.handleDriverResponse(
      assignmentId,
      driver.id,
      response,
      rejectionReason
    )

    return NextResponse.json({
      success: result.success,
      requiresReassignment: result.requiresReassignment,
      message: `Assignment ${response.toLowerCase()} successfully`
    })
  } catch (error) {
    console.error('Error handling driver response:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get driver's pending assignments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Get pending assignments
    const assignments = await prisma.matchingAssignment.findMany({
      where: {
        driverId: driver.id,
        status: 'PENDING',
        responseTimeout: { gt: new Date() }
      },
      include: {
        order: {
          include: {
            vendor: {
              select: {
                businessName: true,
                address: true,
                phone: true
              }
            },
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    image: true
                  }
                }
              }
            }
          }
        },
        ride: {
          include: {
            customer: {
              select: {
                name: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { priority: 'desc' }
    })

    return NextResponse.json({
      success: true,
      assignments,
      totalPending: assignments.length
    })
  } catch (error) {
    console.error('Error getting pending assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
