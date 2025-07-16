
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get user details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageUsers')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        vendorProfile: {
          include: {
            products: { take: 5 },
            orders: { take: 5 }
          }
        },
        driverProfile: {
          include: {
            deliveryOrders: { take: 5 },
            rides: { take: 5 }
          }
        },
        customerOrders: {
          take: 10,
          include: {
            vendor: { select: { businessName: true } },
            driver: { select: { user: { select: { name: true } } } }
          }
        },
        customerRides: {
          take: 10,
          include: {
            driver: { select: { user: { select: { name: true } } } }
          }
        },
        adminPermissions: true,
        adminAuditLogs: {
          take: 20,
          orderBy: { timestamp: 'desc' }
        },
        documents: {
          orderBy: { createdAt: 'desc' }
        },
        kycApplications: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user statistics
    const stats = await prisma.$transaction([
      prisma.order.count({ where: { customerId: user.id } }),
      prisma.ride.count({ where: { customerId: user.id } }),
      prisma.payment.count({ where: { userId: user.id } }),
      prisma.review.count({ where: { userId: user.id } }),
      prisma.notification.count({ where: { userId: user.id } })
    ])

    await logAdminAction(
      authResult.user.id,
      'VIEW_USER_DETAILS',
      'user',
      params.id,
      undefined,
      undefined,
      req
    )

    return NextResponse.json({
      user,
      stats: {
        totalOrders: stats[0],
        totalRides: stats[1],
        totalPayments: stats[2],
        totalReviews: stats[3],
        totalNotifications: stats[4]
      }
    })
  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update user
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageUsers')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const updates = await req.json()
    
    // Get current user data for audit log
    const currentUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updates,
      include: {
        vendorProfile: true,
        driverProfile: true,
        adminPermissions: true
      }
    })

    await logAdminAction(
      authResult.user.id,
      'UPDATE_USER',
      'user',
      params.id,
      currentUser,
      updates,
      req
    )

    return NextResponse.json({ 
      message: 'User updated successfully',
      user: updatedUser 
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete user (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAuth(req, 'ADMIN')
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageUsers')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    // Get user data for audit log
    const user = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Soft delete by deactivating
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    await logAdminAction(
      authResult.user.id,
      'DELETE_USER',
      'user',
      params.id,
      user,
      undefined,
      req
    )

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
