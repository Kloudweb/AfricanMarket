
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // vendors, products, all
    const limit = parseInt(searchParams.get('limit') || '10')
    
    let whereClause: any = {
      userId: session.user.id
    }
    
    if (type !== 'all') {
      whereClause.itemType = type.toUpperCase()
    }
    
    const recentlyViewed = await prisma.recentlyViewed.findMany({
      where: whereClause,
      orderBy: { viewedAt: 'desc' },
      take: limit
    })
    
    // Fetch the actual items
    const vendors = []
    const products = []
    
    for (const item of recentlyViewed) {
      if (item.itemType === 'VENDOR') {
        const vendor = await prisma.vendor.findUnique({
          where: { id: item.itemId },
          include: {
            products: {
              where: { isAvailable: true },
              take: 3,
              orderBy: { popularityScore: 'desc' }
            },
            _count: {
              select: {
                reviews: true,
                orders: true
              }
            }
          }
        })
        
        if (vendor) {
          vendors.push({
            ...vendor,
            viewedAt: item.viewedAt,
            orderCount: vendor._count.orders,
            reviewCount: vendor._count.reviews
          })
        }
      } else if (item.itemType === 'PRODUCT') {
        const product = await prisma.product.findUnique({
          where: { id: item.itemId },
          include: {
            vendor: {
              select: {
                id: true,
                businessName: true,
                logo: true,
                rating: true
              }
            }
          }
        })
        
        if (product) {
          products.push({
            ...product,
            viewedAt: item.viewedAt
          })
        }
      }
    }
    
    return NextResponse.json({
      vendors,
      products,
      total: recentlyViewed.length
    })
    
  } catch (error) {
    console.error('Recently viewed error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recently viewed items' },
      { status: 500 }
    )
  }
}
