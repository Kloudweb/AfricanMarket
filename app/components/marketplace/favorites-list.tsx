
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VendorCard } from './vendor-card'
import { ProductCard } from './product-card'
import { 
  Heart, 
  Store, 
  ChefHat, 
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useSession } from 'next-auth/react'

interface FavoritesListProps {
  className?: string
}

export function FavoritesList({ className = '' }: FavoritesListProps) {
  const { data: session } = useSession()
  const [vendorFavorites, setVendorFavorites] = useState<any[]>([])
  const [productFavorites, setProductFavorites] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('vendors')

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!session?.user?.id) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        const [vendorResponse, productResponse] = await Promise.all([
          fetch('/api/favorites/vendors'),
          fetch('/api/favorites/products')
        ])
        
        if (vendorResponse.ok && productResponse.ok) {
          const vendorData = await vendorResponse.json()
          const productData = await productResponse.json()
          
          setVendorFavorites(vendorData.favorites || [])
          setProductFavorites(productData.favorites || [])
        } else {
          setError('Failed to load favorites')
        }
      } catch (err) {
        setError('Failed to load favorites')
        console.error('Error fetching favorites:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFavorites()
  }, [session])

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
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

  const EmptyState = ({ type }: { type: 'vendors' | 'products' }) => (
    <Card className="p-8 text-center">
      <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
        {type === 'vendors' ? (
          <Store className="h-12 w-12 text-gray-400" />
        ) : (
          <ChefHat className="h-12 w-12 text-gray-400" />
        )}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No favorite {type} yet
      </h3>
      <p className="text-gray-600 mb-4">
        Start exploring and add your favorite {type} to see them here
      </p>
      <Button>
        Browse {type === 'vendors' ? 'Restaurants' : 'Menu Items'}
      </Button>
    </Card>
  )

  if (!session) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Sign in to view favorites
        </h3>
        <p className="text-gray-600 mb-4">
          Create an account to save your favorite restaurants and dishes
        </p>
        <Button>
          Sign In
        </Button>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Favorites</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </Card>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Heart className="h-6 w-6 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900">My Favorites</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {vendorFavorites.length} restaurants
          </Badge>
          <Badge variant="outline">
            {productFavorites.length} dishes
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vendors" className="flex items-center space-x-2">
            <Store className="h-4 w-4" />
            <span>Restaurants ({vendorFavorites.length})</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center space-x-2">
            <ChefHat className="h-4 w-4" />
            <span>Dishes ({productFavorites.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="mt-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : vendorFavorites.length === 0 ? (
            <EmptyState type="vendors" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendorFavorites.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={{ ...vendor, isFavorited: true }}
                  className="relative"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : productFavorites.length === 0 ? (
            <EmptyState type="products" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {productFavorites.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{ ...product, isFavorited: true }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
