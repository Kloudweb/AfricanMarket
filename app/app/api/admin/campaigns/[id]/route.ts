
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminAuth, logAdminAction, hasPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Get campaign details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageCampaigns')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const campaign = await prisma.promotionalCampaign.findUnique({
      where: { id: params.id },
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
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get campaign usage statistics
    const usageStats = await prisma.promoCodeUsage.aggregate({
      where: {
        promoCode: {
          code: campaign.promoCode
        }
      },
      _count: true,
      _sum: {
        discountAmount: true
      }
    })

    await logAdminAction(
      authResult.user.id,
      'VIEW_CAMPAIGN_DETAILS',
      'campaign',
      params.id,
      undefined,
      undefined,
      req
    )

    return NextResponse.json({ 
      campaign,
      usage: {
        totalUsage: usageStats._count,
        totalDiscount: usageStats._sum.discountAmount || 0
      }
    })
  } catch (error) {
    console.error('Error fetching campaign details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update campaign
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAuth(req)
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageCampaigns')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const updates = await req.json()
    
    // Get current campaign for audit log
    const currentCampaign = await prisma.promotionalCampaign.findUnique({
      where: { id: params.id }
    })

    if (!currentCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Update campaign
    const updatedCampaign = await prisma.promotionalCampaign.update({
      where: { id: params.id },
      data: {
        ...updates,
        updatedBy: authResult.user.id,
        actualStart: updates.status === 'ACTIVE' && !currentCampaign.actualStart ? new Date() : currentCampaign.actualStart,
        actualEnd: updates.status === 'COMPLETED' && !currentCampaign.actualEnd ? new Date() : currentCampaign.actualEnd
      },
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
    })

    await logAdminAction(
      authResult.user.id,
      'UPDATE_CAMPAIGN',
      'campaign',
      params.id,
      currentCampaign,
      updates,
      req
    )

    return NextResponse.json({ 
      message: 'Campaign updated successfully',
      campaign: updatedCampaign 
    })
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete campaign
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdminAuth(req, 'ADMIN')
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  if (!hasPermission(authResult.permissions, 'canManageCampaigns')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    // Get campaign data for audit log
    const campaign = await prisma.promotionalCampaign.findUnique({
      where: { id: params.id }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Check if campaign is active
    if (campaign.status === 'ACTIVE') {
      return NextResponse.json({ error: 'Cannot delete active campaign' }, { status: 400 })
    }

    await prisma.promotionalCampaign.delete({
      where: { id: params.id }
    })

    await logAdminAction(
      authResult.user.id,
      'DELETE_CAMPAIGN',
      'campaign',
      params.id,
      campaign,
      undefined,
      req
    )

    return NextResponse.json({ message: 'Campaign deleted successfully' })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
