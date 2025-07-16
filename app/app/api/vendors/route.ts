
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    
    // Filters
    const category = searchParams.get('category')
    const cuisine = searchParams.get('cuisine')
    const minRating = parseFloat(searchParams.get('minRating') || '0')
    const maxDeliveryTime = parseInt(searchParams.get('maxDeliveryTime') || '0')
    const priceRange = searchParams.get('priceRange')
    const dietaryOptions = searchParams.get('dietaryOptions')?.split(',') || []
    const openNow = searchParams.get('openNow') === 'true'
    const featured = searchParams.get('featured') === 'true'
    
    // Location-based filtering
    const latitude = parseFloat(searchParams.get('lat') || '0')
    const longitude = parseFloat(searchParams.get('lng') || '0')
    const radius = parseFloat(searchParams.get('radius') || '50') // km
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'popularity'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Build where clause
    const where: any = {
      isActive: true,
      verificationStatus: 'VERIFIED',
      AND: [
        cuisine ? { cuisineTypes: { has: cuisine } } : {},
        minRating > 0 ? { rating: { gte: minRating } } : {},
        priceRange ? { priceRange } : {},
        dietaryOptions.length > 0 ? { dietaryOptions: { hasSome: dietaryOptions } } : {},
        openNow ? { isCurrentlyOpen: true } : {},
        featured ? { isFeatured: true } : {}
      ]
    }
    
    // Add location-based filtering if coordinates provided
    if (latitude && longitude) {
      where.AND.push({
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } }
        ]
      })
    }
    
    // Build order by clause
    let orderBy: any = {}
    switch (sortBy) {
      case 'rating':
        orderBy = { rating: sortOrder }
        break
      case 'reviews':
        orderBy = { totalReviews: sortOrder }
        break
      case 'distance':
        // Distance sorting will be handled after fetching
        orderBy = { id: 'asc' }
        break
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      case 'alphabetical':
        orderBy = { businessName: 'asc' }
        break
      case 'orders':
        orderBy = { orderCount: sortOrder }
        break
      default:
        orderBy = { popularityScore: 'desc' }
    }
    
    const [vendors, totalCount] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          products: {
            where: { isAvailable: true },
            select: {
              id: true,
              name: true,
              price: true,
              image: true,
              category: true,
              isPopular: true,
              popularityScore: true
            },
            orderBy: { popularityScore: 'desc' },
            take: 6
          },
          _count: {
            select: {
              reviews: true,
              orders: true,
              favorites: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.vendor.count({ where })
    ])
    
    // Calculate distance and filter by radius if location provided
    let processedVendors = vendors.map(vendor => {
      let distance = null
      if (latitude && longitude && vendor.latitude && vendor.longitude) {
        const lat1 = latitude * Math.PI / 180
        const lat2 = vendor.latitude * Math.PI / 180
        const deltaLat = (vendor.latitude - latitude) * Math.PI / 180
        const deltaLng = (vendor.longitude - longitude) * Math.PI / 180
        
        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                 Math.cos(lat1) * Math.cos(lat2) *
                 Math.sin(deltaLng/2) * Math.sin(deltaLng/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        distance = 6371 * c // Distance in km
      }
      
      return {
        ...vendor,
        distance,
        orderCount: vendor._count.orders,
        reviewCount: vendor._count.reviews,
        favoriteCount: vendor._count.favorites,
        averagePrice: vendor.products.length > 0 
          ? vendor.products.reduce((sum, p) => sum + p.price, 0) / vendor.products.length
          : 0
      }
    })
    
    // Filter by radius if specified
    if (latitude && longitude) {
      processedVendors = processedVendors.filter(vendor => 
        !vendor.distance || vendor.distance <= radius
      )
    }
    
    // Sort by distance if requested
    if (sortBy === 'distance' && latitude && longitude) {
      processedVendors.sort((a, b) => {
        const distA = a.distance || Infinity
        const distB = b.distance || Infinity
        return distA - distB
      })
    }
    
    const hasMore = totalCount > (page * limit)
    
    return NextResponse.json({
      vendors: processedVendors,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
    
  } catch (error) {
    console.error('Vendors API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}
