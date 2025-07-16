
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'
import { AdminUserFilters } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Get all users with filtering and pagination
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageUsers')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const role = searchParams.get('role')
    const isActive = searchParams.get('isActive')
    const isVerified = searchParams.get('isVerified')
    const searchTerm = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Build filter conditions
    const where: any = {}
    
    if (role) where.role = role
    if (isActive !== null) where.isActive = isActive === 'true'
    if (isVerified !== null) where.isVerified = isVerified === 'true'
    
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          vendorProfile: {
            select: {
              id: true,
              businessName: true,
              verificationStatus: true,
              rating: true
            }
          },
          driverProfile: {
            select: {
              id: true,
              vehicleType: true,
              verificationStatus: true,
              rating: true
            }
          },
          customerOrders: {
            select: { id: true },
            take: 1
          },
          adminPermissions: {
            select: {
              level: true,
              isActive: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ])

    // Get user statistics
    const stats = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
      where: { isActive: true }
    })

    await logAdminAction(
      authResult.user.id,
      'VIEW_USERS',
      'users',
      undefined,
      undefined,
      { filters: Object.fromEntries(searchParams.entries()) },
      req
    )

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Bulk user operations
export async function POST(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageUsers')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { action, userIds, data } = await req.json()

    let result
    switch (action) {
      case 'activate':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: true }
        })
        break
      
      case 'deactivate':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: false }
        })
        break
      
      case 'verify':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isVerified: true }
        })
        break
      
      case 'update_role':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { role: data.role }
        })
        break
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await logAdminAction(
      authResult.user.id,
      `BULK_USER_${action.toUpperCase()}`,
      'users',
      undefined,
      undefined,
      { action, userIds, data },
      req
    )

    return NextResponse.json({
      message: `Successfully ${action}d ${result.count} users`,
      count: result.count
    })
  } catch (error) {
    console.error('Error performing bulk user operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
