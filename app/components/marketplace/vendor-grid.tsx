
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { VendorCard } from './vendor-card'
import { 
  Grid3X3, 
  List, 
  MapPin, 
  Loader2,
  AlertCircle
} from 'lucide-react'

interface Vendor {
  id: string
  businessName: string
  businessType: string
  description?: string
  logo?: string
  coverImage?: string
  city: string
  rating: number
  totalReviews: number
  distance?: number
  orderCount: number
  reviewCount: number
  favoriteCount: number
  averagePrice: number
  products: Array<{
    id: string
    name: string
    price: number
    image?: string
    category: string
    isPopular: boolean
  }>
}

interface VendorGridProps {
  searchQuery?: string
  filters?: any
  className?: string
}

type ViewMode = 'grid' | 'list' | 'map'

export function VendorGrid({ searchQuery, filters, className = '' }: VendorGridProps) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch vendors
  useEffect(() => {
    const fetchVendors = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20'
        })
        
        if (searchQuery) {
          const searchResponse = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=vendors&${params}`)
          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            setVendors(prev => page === 1 ? searchData.vendors : [...prev, ...searchData.vendors])
            setHasMore(searchData.hasMore)
            setTotalCount(searchData.totalVendors)
          }
        } else {
          // Add filters to params
          if (filters?.categories?.length > 0) {
            params.append('categories', filters.categories.join(','))
          }
          if (filters?.cuisines?.length > 0) {
            params.append('cuisine', filters.cuisines.join(','))
          }
          if (filters?.priceRange) {
            params.append('minPrice', filters.priceRange[0].toString())
            params.append('maxPrice', filters.priceRange[1].toString())
          }
          if (filters?.rating > 0) {
            params.append('minRating', filters.rating.toString())
          }
          if (filters?.deliveryTime < 120) {
            params.append('maxDeliveryTime', filters.deliveryTime.toString())
          }
          if (filters?.distance < 50) {
            params.append('radius', filters.distance.toString())
          }
          if (filters?.dietaryOptions?.length > 0) {
            params.append('dietaryOptions', filters.dietaryOptions.join(','))
          }
          if (filters?.features?.includes('Open Now')) {
            params.append('openNow', 'true')
          }
          if (filters?.features?.includes('Featured')) {
            params.append('featured', 'true')
          }
          if (filters?.sortBy && filters.sortBy !== 'relevance') {
            params.append('sortBy', filters.sortBy)
          }
          if (filters?.sortOrder) {
            params.append('sortOrder', filters.sortOrder)
          }
          
          const response = await fetch(`/api/vendors?${params}`)
          if (response.ok) {
            const data = await response.json()
            setVendors(prev => page === 1 ? data.vendors : [...prev, ...data.vendors])
            setHasMore(data.pagination.hasMore)
            setTotalCount(data.pagination.total)
          }
        }
      } catch (err) {
        setError('Failed to load vendors')
        console.error('Error fetching vendors:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVendors()
  }, [searchQuery, filters, page])

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1)
    setVendors([])
  }, [searchQuery, filters])

  const loadMore = () => {
    if (hasMore && !isLoading) {
      setPage(prev => prev + 1)
    }
  }

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  if (error) {
    return (
      <div className={`${className}`}>
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Vendors</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'Restaurants'}
          </h2>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {totalCount} found
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && vendors.length === 0 && <LoadingSkeleton />}

      {/* No Results */}
      {!isLoading && vendors.length === 0 && (
        <Card className="p-8 text-center">
          <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No restaurants found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery 
              ? `No restaurants match your search for "${searchQuery}"`
              : 'Try adjusting your filters or search terms'
            }
          </p>
          <Button onClick={() => window.location.reload()}>
            Clear Filters
          </Button>
        </Card>
      )}

      {/* Vendors Grid */}
      {vendors.length > 0 && (
        <>
          <div className={`
            ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : ''}
            ${viewMode === 'list' ? 'space-y-4' : ''}
            ${viewMode === 'map' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}
          `}>
            {vendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                viewMode={viewMode}
                showDistance={!!vendor.distance}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={loadMore}
                disabled={isLoading}
                className="px-8"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}

          {/* End of Results */}
          {!hasMore && vendors.length > 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>You've reached the end of the results</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
