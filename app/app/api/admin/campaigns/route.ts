
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get all campaigns
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageCampaigns')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const searchTerm = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Build filter conditions
    const where: any = {}
    
    if (status) where.status = status
    if (type) where.type = type
    
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { promoCode: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }

    // Get campaigns with pagination
    const [campaigns, totalCount] = await Promise.all([
      prisma.promotionalCampaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          creator: {
            select: {
              name: true,
              email: true
            }
          },
          updater: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.promotionalCampaign.count({ where })
    ])

    // Get campaign statistics
    const stats = await prisma.promotionalCampaign.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { 
        currentSpend: true,
        currentUsageCount: true,
        revenue: true
      }
    })

    // Get performance metrics
    const performanceMetrics = await prisma.promotionalCampaign.aggregate({
      _sum: {
        budget: true,
        currentSpend: true,
        impressions: true,
        clicks: true,
        conversions: true,
        revenue: true
      },
      _avg: {
        conversions: true
      }
    })

    await logAdminAction(
      authResult.user.id,
      'VIEW_CAMPAIGNS',
      'campaigns',
      undefined,
      undefined,
      { filters: Object.fromEntries(searchParams.entries()) },
      req
    )

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats,
      performance: {
        totalBudget: performanceMetrics._sum.budget || 0,
        totalSpend: performanceMetrics._sum.currentSpend || 0,
        totalImpressions: performanceMetrics._sum.impressions || 0,
        totalClicks: performanceMetrics._sum.clicks || 0,
        totalConversions: performanceMetrics._sum.conversions || 0,
        totalRevenue: performanceMetrics._sum.revenue || 0,
        avgConversionRate: performanceMetrics._avg.conversions || 0
      }
    })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create new campaign
export async function POST(req: NextRequest) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageCampaigns')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const campaignData = await req.json()

    // Generate promo code if not provided
    if (!campaignData.promoCode) {
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      campaignData.promoCode = `${campaignData.type.substring(0, 3)}${randomCode}`
    }

    const campaign = await prisma.promotionalCampaign.create({
      data: {
        ...campaignData,
        createdBy: authResult.user.id
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    await logAdminAction(
      authResult.user.id,
      'CREATE_CAMPAIGN',
      'campaign',
      campaign.id,
      undefined,
      campaignData,
      req
    )

    return NextResponse.json({
      message: 'Campaign created successfully',
      campaign
    })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
