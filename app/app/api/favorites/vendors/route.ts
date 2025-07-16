
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    
    const [favorites, totalCount] = await Promise.all([
      prisma.vendorFavorite.findMany({
        where: {
          userId: session.user.id
        },
        include: {
          vendor: {
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
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.vendorFavorite.count({
        where: {
          userId: session.user.id
        }
      })
    ])
    
    const processedFavorites = favorites.map(fav => ({
      ...fav.vendor,
      favoritedAt: fav.createdAt,
      orderCount: fav.vendor._count.orders,
      reviewCount: fav.vendor._count.reviews
    }))
    
    return NextResponse.json({
      favorites: processedFavorites,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: totalCount > (page * limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    })
    
  } catch (error) {
    console.error('Vendor favorites error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch favorite vendors' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { vendorId } = await request.json()
    
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      )
    }
    
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    })
    
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }
    
    // Add to favorites
    const favorite = await prisma.vendorFavorite.create({
      data: {
        userId: session.user.id,
        vendorId
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            logo: true
          }
        }
      }
    })
    
    return NextResponse.json(favorite)
    
  } catch (error: any) {
    console.error('Add vendor favorite error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Vendor already in favorites' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to add vendor to favorites' },
      { status: 500 }
    )
  }
}
