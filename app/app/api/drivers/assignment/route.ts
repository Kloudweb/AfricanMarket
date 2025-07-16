
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get driver assignments
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

    const assignments = await prisma.driverAssignment.findMany({
      where: {
        driverId: driver.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        order: {
          include: {
            vendor: {
              select: {
                businessName: true,
                address: true,
                phone: true,
                latitude: true,
                longitude: true
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
        }
      },
      orderBy: { priority: 'desc' }
    })

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Error fetching driver assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Respond to assignment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assignmentId, response, message } = await req.json()

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const assignment = await prisma.driverAssignment.findUnique({
      where: { id: assignmentId },
      include: { order: true }
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (assignment.driverId !== driver.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (assignment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Assignment already responded to' }, { status: 400 })
    }

    // Update assignment
    await prisma.driverAssignment.update({
      where: { id: assignmentId },
      data: {
        status: response,
        respondedAt: new Date(),
        response: message
      }
    })

    if (response === 'ACCEPTED') {
      // Assign driver to order
      await prisma.order.update({
        where: { id: assignment.orderId },
        data: {
          driverId: driver.id,
          status: 'READY_FOR_PICKUP'
        }
      })

      // Add tracking entry
      await prisma.orderTracking.create({
        data: {
          orderId: assignment.orderId,
          status: 'READY_FOR_PICKUP',
          message: 'Driver assigned and heading to pickup location',
          updatedBy: session.user.id
        }
      })

      // Reject other pending assignments for this order
      await prisma.driverAssignment.updateMany({
        where: {
          orderId: assignment.orderId,
          status: 'PENDING',
          id: { not: assignmentId }
        },
        data: { status: 'EXPIRED' }
      })

      // Update driver availability
      await prisma.driver.update({
        where: { id: driver.id },
        data: { isAvailable: false }
      })
    }

    return NextResponse.json({
      message: `Assignment ${response.toLowerCase()} successfully`,
      assignment: {
        id: assignment.id,
        status: response,
        respondedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Error responding to assignment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
