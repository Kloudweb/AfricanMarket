
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { VendorCard } from './vendor-card'
import { 
  Star, 
  TrendingUp, 
  Crown, 
  ArrowRight,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface FeaturedVendorsProps {
  limit?: number
  showAll?: boolean
  className?: string
}

export function FeaturedVendors({ 
  limit = 6, 
  showAll = false, 
  className = '' 
}: FeaturedVendorsProps) {
  const [vendors, setVendors] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFeaturedVendors = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/vendors/featured?limit=${limit}`)
        
        if (response.ok) {
          const data = await response.json()
          setVendors(data.vendors || [])
        } else {
          setError('Failed to load featured vendors')
        }
      } catch (err) {
        setError('Failed to load featured vendors')
        console.error('Error fetching featured vendors:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeaturedVendors()
  }, [limit])

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const EmptyState = () => (
    <Card className="p-6 text-center">
      <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
        <Star className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No featured vendors right now
      </h3>
      <p className="text-gray-600 text-sm mb-3">
        Check back later for featured restaurants and special offers
      </p>
      <Button size="sm" asChild>
        <Link href="/marketplace">
          Browse All Restaurants
        </Link>
      </Button>
    </Card>
  )

  if (error) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <h3 className="text-sm font-semibold mb-1">Error Loading</h3>
        <p className="text-xs text-gray-600">{error}</p>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span>Featured Restaurants</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (vendors.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span>Featured Restaurants</span>
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
            <Crown className="h-5 w-5 text-yellow-500" />
            <span>Featured Restaurants</span>
            <Badge variant="secondary" className="ml-2">
              {vendors.length}
            </Badge>
          </div>
          {!showAll && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/marketplace?featured=true">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.slice(0, showAll ? vendors.length : limit).map((vendor, index) => (
            <div key={vendor.id} className="relative">
              <VendorCard vendor={vendor} className="h-full" />
              
              {/* Featured Badge */}
              <div className="absolute top-2 left-2 z-10">
                <Badge className="bg-yellow-500 text-white shadow-lg">
                  <Crown className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              </div>
              
              {/* Ranking Badge */}
              {index < 3 && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge variant="secondary" className="shadow-lg">
                    #{index + 1}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
