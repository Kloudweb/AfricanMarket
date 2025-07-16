
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')
    
    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }
    
    // Get vendor suggestions
    const vendorSuggestions = await prisma.vendor.findMany({
      where: {
        isActive: true,
        verificationStatus: 'VERIFIED',
        OR: [
          { businessName: { contains: query, mode: 'insensitive' } },
          { businessType: { contains: query, mode: 'insensitive' } },
          { searchKeywords: { hasSome: query.split(' ') } }
        ]
      },
      select: {
        id: true,
        businessName: true,
        businessType: true,
        logo: true,
        rating: true
      },
      take: Math.ceil(limit / 2),
      orderBy: { popularityScore: 'desc' }
    })
    
    // Get product suggestions
    const productSuggestions = await prisma.product.findMany({
      where: {
        isAvailable: true,
        vendor: {
          isActive: true,
          verificationStatus: 'VERIFIED'
        },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
          { searchKeywords: { hasSome: query.split(' ') } }
        ]
      },
      select: {
        id: true,
        name: true,
        category: true,
        image: true,
        price: true,
        vendor: {
          select: {
            id: true,
            businessName: true
          }
        }
      },
      take: Math.floor(limit / 2),
      orderBy: { popularityScore: 'desc' }
    })
    
    // Get popular/recent searches
    const popularSearches = await prisma.searchQuery.groupBy({
      by: ['query'],
      where: {
        query: { contains: query, mode: 'insensitive' },
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      _count: {
        query: true
      },
      orderBy: {
        _count: {
          query: 'desc'
        }
      },
      take: 5
    })
    
    const suggestions = {
      vendors: vendorSuggestions.map(v => ({
        ...v,
        type: 'vendor'
      })),
      products: productSuggestions.map(p => ({
        ...p,
        type: 'product'
      })),
      searches: popularSearches.map(s => ({
        query: s.query,
        count: s._count.query,
        type: 'search'
      }))
    }
    
    return NextResponse.json(suggestions)
    
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
}
