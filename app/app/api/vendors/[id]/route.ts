
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const vendorId = params.id
    
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        products: {
          where: { isAvailable: true },
          include: {
            reviews: {
              take: 3,
              orderBy: { createdAt: 'desc' },
              include: {
                user: {
                  select: {
                    name: true,
                    avatar: true
                  }
                }
              }
            }
          },
          orderBy: [
            { isPopular: 'desc' },
            { popularityScore: 'desc' },
            { displayOrder: 'asc' }
          ]
        },
        categories: {
          include: {
            products: {
              where: { isAvailable: true },
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                name: true,
                avatar: true
              }
            },
            product: {
              select: {
                name: true
              }
            }
          }
        },
        hours: {
          orderBy: { dayOfWeek: 'asc' }
        },
        _count: {
          select: {
            reviews: true,
            orders: true,
            favorites: true
          }
        }
      }
    })
    
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }
    
    // Check if user has favorited this vendor
    let isFavorited = false
    if (session?.user?.id) {
      const favorite = await prisma.vendorFavorite.findUnique({
        where: {
          userId_vendorId: {
            userId: session.user.id,
            vendorId
          }
        }
      })
      isFavorited = !!favorite
    }
    
    // Track vendor view
    await prisma.vendorView.create({
      data: {
        userId: session?.user?.id || null,
        vendorId,
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
        sessionId: request.headers.get('x-session-id')
      }
    })
    
    // Update vendor view count
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        viewCount: {
          increment: 1
        }
      }
    })
    
    // Add recently viewed for logged-in users
    if (session?.user?.id) {
      await prisma.recentlyViewed.upsert({
        where: {
          userId_itemType_itemId: {
            userId: session.user.id,
            itemType: 'VENDOR',
            itemId: vendorId
          }
        },
        create: {
          userId: session.user.id,
          itemType: 'VENDOR',
          itemId: vendorId
        },
        update: {
          viewedAt: new Date()
        }
      })
    }
    
    const processedVendor = {
      ...vendor,
      isFavorited,
      orderCount: vendor._count.orders,
      reviewCount: vendor._count.reviews,
      favoriteCount: vendor._count.favorites,
      productsByCategory: vendor.categories.map(category => ({
        ...category,
        products: vendor.products.filter(p => p.categoryId === category.id)
      }))
    }
    
    return NextResponse.json(processedVendor)
    
  } catch (error) {
    console.error('Vendor details error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor details' },
      { status: 500 }
    )
  }
}
