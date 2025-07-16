
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const featuredVendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
        verificationStatus: 'VERIFIED',
        isFeatured: true,
        featuredUntil: {
          gte: new Date()
        }
      },
      include: {
        products: {
          where: { isAvailable: true },
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            category: true,
            isPopular: true
          },
          orderBy: { popularityScore: 'desc' },
          take: 3
        },
        _count: {
          select: {
            reviews: true,
            orders: true
          }
        }
      },
      orderBy: [
        { popularityScore: 'desc' },
        { rating: 'desc' }
      ],
      take: limit
    })
    
    const processedVendors = featuredVendors.map(vendor => ({
      ...vendor,
      orderCount: vendor._count.orders,
      reviewCount: vendor._count.reviews
    }))
    
    return NextResponse.json({ vendors: processedVendors })
    
  } catch (error) {
    console.error('Featured vendors error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch featured vendors' },
      { status: 500 }
    )
  }
}
