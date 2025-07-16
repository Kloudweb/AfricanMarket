
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get dispute details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageDisputes')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          include: {
            customerOrders: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            },
            customerRides: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        vendor: {
          include: {
            orders: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        driver: {
          include: {
            user: true,
            deliveryOrders: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            },
            rides: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        order: {
          include: {
            items: {
              include: {
                product: true
              }
            },
            payment: true,
            tracking: {
              orderBy: { timestamp: 'desc' }
            }
          }
        },
        ride: {
          include: {
            tracking: {
              orderBy: { timestamp: 'desc' }
            }
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    await logAdminAction(
      authResult.user.id,
      'VIEW_DISPUTE_DETAILS',
      'dispute',
      params.id,
      undefined,
      undefined,
      req
    )

    return NextResponse.json({ dispute })
  } catch (error) {
    console.error('Error fetching dispute details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update dispute
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageDisputes')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const updates = await req.json()
    
    // Get current dispute for audit log
    const currentDispute = await prisma.dispute.findUnique({
      where: { id: params.id }
    })

    if (!currentDispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // Update dispute
    const updatedDispute = await prisma.dispute.update({
      where: { id: params.id },
      data: {
        ...updates,
        acknowledgedAt: updates.status === 'INVESTIGATING' && !currentDispute.acknowledgedAt ? new Date() : currentDispute.acknowledgedAt,
        resolvedAt: updates.status === 'RESOLVED' && !currentDispute.resolvedAt ? new Date() : currentDispute.resolvedAt,
        closedAt: updates.status === 'CLOSED' && !currentDispute.closedAt ? new Date() : currentDispute.closedAt,
        escalatedAt: updates.status === 'ESCALATED' && !currentDispute.escalatedAt ? new Date() : currentDispute.escalatedAt
      },
      include: {
        customer: true,
        vendor: true,
        driver: true,
        order: true,
        ride: true,
        assignee: true
      }
    })

    await logAdminAction(
      authResult.user.id,
      'UPDATE_DISPUTE',
      'dispute',
      params.id,
      currentDispute,
      updates,
      req
    )

    return NextResponse.json({ 
      message: 'Dispute updated successfully',
      dispute: updatedDispute 
    })
  } catch (error) {
    console.error('Error updating dispute:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add dispute review
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageDisputes')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { action, comment, evidence, internalNotes, timeSpent } = await req.json()

    const review = await prisma.disputeReview.create({
      data: {
        disputeId: params.id,
        reviewerId: authResult.user.id,
        action,
        comment,
        evidence: evidence || [],
        internalNotes,
        timeSpent
      },
      include: {
        reviewer: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    await logAdminAction(
      authResult.user.id,
      'ADD_DISPUTE_REVIEW',
      'dispute',
      params.id,
      undefined,
      { action, comment, evidence, internalNotes, timeSpent },
      req
    )

    return NextResponse.json({
      message: 'Dispute review added successfully',
      review
    })
  } catch (error) {
    console.error('Error adding dispute review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
