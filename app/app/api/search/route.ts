
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all' // vendors, products, all
    const category = searchParams.get('category') || ''
    const cuisineType = searchParams.get('cuisine') || ''
    const minRating = parseFloat(searchParams.get('minRating') || '0')
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '1000')
    const minPrice = parseFloat(searchParams.get('minPrice') || '0')
    const sortBy = searchParams.get('sortBy') || 'relevance' // relevance, rating, price, distance
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const latitude = parseFloat(searchParams.get('lat') || '0')
    const longitude = parseFloat(searchParams.get('lng') || '0')
    const radius = parseFloat(searchParams.get('radius') || '50') // km
    const openNow = searchParams.get('openNow') === 'true'
    const dietaryOptions = searchParams.get('dietaryOptions')?.split(',') || []
    
    const skip = (page - 1) * limit
    
    // Track search query for analytics
    if (query.length > 0) {
      await prisma.searchQuery.create({
        data: {
          userId: session?.user?.id || null,
          query,
          filters: {
            type,
            category,
            cuisineType,
            minRating,
            maxPrice,
            minPrice,
            sortBy,
            latitude,
            longitude,
            radius,
            openNow,
            dietaryOptions
          },
          ipAddress: request.ip,
          userAgent: request.headers.get('user-agent'),
          sessionId: request.headers.get('x-session-id')
        }
      })
    }
    
    const results = {
      vendors: [] as any[],
      products: [] as any[],
      totalVendors: 0,
      totalProducts: 0,
      page,
      limit,
      hasMore: false
    }
    
    // Search vendors
    if (type === 'vendors' || type === 'all') {
      const vendorWhere: any = {
        isActive: true,
        verificationStatus: 'VERIFIED',
        AND: [
          query ? {
            OR: [
              { businessName: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { businessType: { contains: query, mode: 'insensitive' } },
              { searchKeywords: { hasSome: query.split(' ') } },
              { tags: { hasSome: query.split(' ') } }
            ]
          } : {},
          minRating > 0 ? { rating: { gte: minRating } } : {},
          cuisineType ? { cuisineTypes: { has: cuisineType } } : {},
          openNow ? { isCurrentlyOpen: true } : {},
          dietaryOptions.length > 0 ? { dietaryOptions: { hasSome: dietaryOptions } } : {}
        ]
      }
      
      // Add location-based filtering if coordinates provided
      if (latitude && longitude) {
        vendorWhere.AND.push({
          AND: [
            { latitude: { not: null } },
            { longitude: { not: null } }
          ]
        })
      }
      
      let vendorOrderBy: any = {}
      if (sortBy === 'rating') {
        vendorOrderBy = { rating: 'desc' }
      } else if (sortBy === 'popularity') {
        vendorOrderBy = { popularityScore: 'desc' }
      } else if (sortBy === 'newest') {
        vendorOrderBy = { createdAt: 'desc' }
      } else {
        vendorOrderBy = { popularityScore: 'desc' } // Default relevance
      }
      
      const [vendors, vendorCount] = await Promise.all([
        prisma.vendor.findMany({
          where: vendorWhere,
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            },
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
          },
          orderBy: vendorOrderBy,
          skip: type === 'vendors' ? skip : 0,
          take: type === 'vendors' ? limit : 10
        }),
        prisma.vendor.count({ where: vendorWhere })
      ])
      
      // Calculate distance if coordinates provided
      const vendorsWithDistance = vendors.map(vendor => {
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
          reviewCount: vendor._count.reviews
        }
      })
      
      // Filter by radius if specified
      const filteredVendors = vendorsWithDistance.filter(vendor => 
        !latitude || !longitude || !vendor.distance || vendor.distance <= radius
      )
      
      results.vendors = filteredVendors
      results.totalVendors = vendorCount
    }
    
    // Search products
    if (type === 'products' || type === 'all') {
      const productWhere: any = {
        isAvailable: true,
        vendor: {
          isActive: true,
          verificationStatus: 'VERIFIED'
        },
        AND: [
          query ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { category: { contains: query, mode: 'insensitive' } },
              { ingredients: { contains: query, mode: 'insensitive' } },
              { searchKeywords: { hasSome: query.split(' ') } },
              { tags: { hasSome: query.split(' ') } }
            ]
          } : {},
          category ? { category: { contains: category, mode: 'insensitive' } } : {},
          minPrice > 0 ? { price: { gte: minPrice } } : {},
          maxPrice < 1000 ? { price: { lte: maxPrice } } : {},
          minRating > 0 ? { rating: { gte: minRating } } : {},
          dietaryOptions.length > 0 ? { dietaryInfo: { hasSome: dietaryOptions } } : {}
        ]
      }
      
      let productOrderBy: any = {}
      if (sortBy === 'price') {
        productOrderBy = { price: 'asc' }
      } else if (sortBy === 'rating') {
        productOrderBy = { rating: 'desc' }
      } else if (sortBy === 'popularity') {
        productOrderBy = { popularityScore: 'desc' }
      } else {
        productOrderBy = { popularityScore: 'desc' } // Default relevance
      }
      
      const [products, productCount] = await Promise.all([
        prisma.product.findMany({
          where: productWhere,
          include: {
            vendor: {
              select: {
                id: true,
                businessName: true,
                rating: true,
                deliveryTime: true,
                latitude: true,
                longitude: true
              }
            }
          },
          orderBy: productOrderBy,
          skip: type === 'products' ? skip : 0,
          take: type === 'products' ? limit : 10
        }),
        prisma.product.count({ where: productWhere })
      ])
      
      results.products = products
      results.totalProducts = productCount
    }
    
    // Update search analytics
    if (query.length > 0) {
      await prisma.searchQuery.updateMany({
        where: {
          query,
          timestamp: {
            gte: new Date(Date.now() - 60000) // Last minute
          }
        },
        data: {
          resultsCount: results.totalVendors + results.totalProducts
        }
      })
    }
    
    const totalResults = results.totalVendors + results.totalProducts
    results.hasMore = totalResults > (page * limit)
    
    return NextResponse.json(results)
    
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    )
  }
}
