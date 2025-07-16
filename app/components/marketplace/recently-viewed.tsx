
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { VendorCard } from './vendor-card'
import { ProductCard } from './product-card'
import { 
  Clock, 
  Store, 
  ChefHat, 
  AlertCircle,
  Eye,
  ArrowRight
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface RecentlyViewedProps {
  limit?: number
  showAll?: boolean
  className?: string
}

export function RecentlyViewed({ 
  limit = 6, 
  showAll = false, 
  className = '' 
}: RecentlyViewedProps) {
  const { data: session } = useSession()
  const [vendors, setVendors] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      if (!session?.user?.id) {
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/recently-viewed?limit=${limit}`)
        
        if (response.ok) {
          const data = await response.json()
          setVendors(data.vendors || [])
          setProducts(data.products || [])
        } else {
          setError('Failed to load recently viewed items')
        }
      } catch (err) {
        setError('Failed to load recently viewed items')
        console.error('Error fetching recently viewed:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentlyViewed()
  }, [session, limit])

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-32 w-full" />
          <CardContent className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const EmptyState = () => (
    <Card className="p-6 text-center">
      <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
        <Eye className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No recently viewed items
      </h3>
      <p className="text-gray-600 text-sm mb-3">
        Start browsing restaurants and dishes to see them here
      </p>
      <Button size="sm" asChild>
        <Link href="/marketplace">
          Browse Marketplace
        </Link>
      </Button>
    </Card>
  )

  if (!session) {
    return null
  }

  if (error) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <h3 className="text-sm font-semibold mb-1">Error Loading</h3>
        <p className="text-xs text-gray-600">{error}</p>
      </Card>
    )
  }

  const totalItems = vendors.length + products.length

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recently Viewed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (totalItems === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recently Viewed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recently Viewed</span>
            <Badge variant="secondary" className="ml-2">
              {totalItems}
            </Badge>
          </div>
          {!showAll && totalItems > limit && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/marketplace/recently-viewed">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Vendors Section */}
        {vendors.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Store className="h-4 w-4 mr-1" />
              Restaurants ({vendors.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.slice(0, showAll ? vendors.length : Math.floor(limit / 2)).map((vendor) => (
                <div key={vendor.id} className="relative">
                  <VendorCard vendor={vendor} className="h-full" />
                  <div className="absolute top-2 left-2 z-10">
                    <Badge variant="secondary" className="text-xs">
                      {new Date(vendor.viewedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products Section */}
        {products.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <ChefHat className="h-4 w-4 mr-1" />
              Dishes ({products.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.slice(0, showAll ? products.length : Math.floor(limit / 2)).map((product) => (
                <div key={product.id} className="relative">
                  <ProductCard product={product} />
                  <div className="absolute top-2 left-2 z-10">
                    <Badge variant="secondary" className="text-xs">
                      {new Date(product.viewedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
