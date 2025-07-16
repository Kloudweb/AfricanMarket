
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
      prisma.productFavorite.findMany({
        where: {
          userId: session.user.id
        },
        include: {
          product: {
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
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.productFavorite.count({
        where: {
          userId: session.user.id
        }
      })
    ])
    
    const processedFavorites = favorites.map(fav => ({
      ...fav.product,
      favoritedAt: fav.createdAt
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
    console.error('Product favorites error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch favorite products' },
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
    
    const { productId } = await request.json()
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }
    
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    // Add to favorites
    const favorite = await prisma.productFavorite.create({
      data: {
        userId: session.user.id,
        productId
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true
          }
        }
      }
    })
    
    return NextResponse.json(favorite)
    
  } catch (error: any) {
    console.error('Add product favorite error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Product already in favorites' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to add product to favorites' },
      { status: 500 }
    )
  }
}
