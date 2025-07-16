
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get all disputes with filtering
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageDisputes')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const assignedTo = searchParams.get('assignedTo')
    const searchTerm = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Build filter conditions
    const where: any = {}
    
    if (status) where.status = status
    if (type) where.type = type
    if (category) where.category = category
    if (assignedTo) where.assignedTo = assignedTo
    
    if (searchTerm) {
      where.OR = [
        { disputeNumber: { contains: searchTerm, mode: 'insensitive' } },
        { subject: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { vendor: { businessName: { contains: searchTerm, mode: 'insensitive' } } }
      ]
    }

    // Get disputes with pagination
    const [disputes, totalCount] = await Promise.all([
      prisma.dispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          vendor: {
            select: {
              id: true,
              businessName: true
            }
          },
          driver: {
            select: {
              id: true,
              user: {
                select: {
                  name: true
                }
              }
            }
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true
            }
          },
          ride: {
            select: {
              id: true,
              rideNumber: true,
              actualFare: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true
            }
          },
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }),
      prisma.dispute.count({ where })
    ])

    // Get dispute statistics
    const stats = await prisma.dispute.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    // Get category distribution
    const categoryStats = await prisma.dispute.groupBy({
      by: ['category'],
      _count: { category: true }
    })

    await logAdminAction(
      authResult.user.id,
      'VIEW_DISPUTES',
      'disputes',
      undefined,
      undefined,
      { filters: Object.fromEntries(searchParams.entries()) },
      req
    )

    return NextResponse.json({
      disputes,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats: {
        byStatus: stats,
        byCategory: categoryStats
      }
    })
  } catch (error) {
    console.error('Error fetching disputes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create new dispute
export async function POST(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageDisputes')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const disputeData = await req.json()

    // Generate dispute number
    const disputeCount = await prisma.dispute.count()
    const disputeNumber = `DSP${String(disputeCount + 1).padStart(6, '0')}`

    const dispute = await prisma.dispute.create({
      data: {
        ...disputeData,
        disputeNumber,
        assignedTo: authResult.user.id,
        assignedAt: new Date()
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
      'CREATE_DISPUTE',
      'dispute',
      dispute.id,
      undefined,
      disputeData,
      req
    )

    return NextResponse.json({
      message: 'Dispute created successfully',
      dispute
    })
  } catch (error) {
    console.error('Error creating dispute:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
