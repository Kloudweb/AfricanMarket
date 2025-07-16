
'use client'

import { useState } from 'react'
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Star, 
  Clock, 
  MapPin, 
  DollarSign,
  ChefHat,
  Heart,
  Eye,
  ShoppingBag,
  Users,
  Navigation,
  Truck
} from "lucide-react"
import { useSession } from 'next-auth/react'

interface VendorCardProps {
  vendor: {
    id: string
    businessName: string
    businessType: string
    description?: string | null
    logo?: string | null
    coverImage?: string | null
    city: string
    rating: number
    totalReviews: number
    distance?: number
    orderCount?: number
    reviewCount?: number
    favoriteCount?: number
    averagePrice?: number
    isFavorited?: boolean
    products: {
      id: string
      name: string
      price: number
      category: string
      image?: string | null
      isPopular?: boolean
    }[]
  }
  viewMode?: 'grid' | 'list' | 'map'
  showDistance?: boolean
  className?: string
}

export function VendorCard({ 
  vendor, 
  viewMode = 'grid', 
  showDistance = false,
  className = ''
}: VendorCardProps) {
  const { data: session } = useSession()
  const [isFavorited, setIsFavorited] = useState(vendor.isFavorited || false)
  const [isToggling, setIsToggling] = useState(false)

  const averagePrice = vendor.averagePrice || 
    (vendor.products.reduce((sum, product) => sum + product.price, 0) / vendor.products.length) || 0

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!session) {
      // Redirect to login
      window.location.href = '/auth/signin'
      return
    }

    setIsToggling(true)
    
    try {
      const method = isFavorited ? 'DELETE' : 'POST'
      const url = isFavorited 
        ? `/api/favorites/vendors/${vendor.id}`
        : '/api/favorites/vendors'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method === 'POST' ? JSON.stringify({ vendorId: vendor.id }) : undefined,
      })

      if (response.ok) {
        setIsFavorited(!isFavorited)
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsToggling(false)
    }
  }

  if (viewMode === 'list') {
    return (
      <Card className={`group hover:shadow-lg transition-shadow duration-300 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            {/* Logo */}
            <div className="relative w-16 h-16 bg-white rounded-lg shadow-lg border-2 border-white overflow-hidden flex-shrink-0">
              <Image
                src={vendor.logo || "/api/placeholder/64/64"}
                alt={vendor.businessName}
                fill
                className="object-cover"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-orange-600 transition-colors">
                    {vendor.businessName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{vendor.businessType}</p>
                  
                  {/* Stats */}
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span>{vendor.rating.toFixed(1)}</span>
                      <span>({vendor.reviewCount || vendor.totalReviews})</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{vendor.city}</span>
                      {showDistance && vendor.distance && (
                        <span>• {vendor.distance.toFixed(1)} km</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4" />
                      <span>${averagePrice.toFixed(0)} avg</span>
                    </div>
                  </div>

                  {/* Description */}
                  {vendor.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {vendor.description}
                    </p>
                  )}

                  {/* Popular Items */}
                  {vendor.products.length > 0 && (
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-xs font-medium text-gray-700">Popular:</span>
                      {vendor.products.slice(0, 3).map((product, index) => (
                        <Badge key={product.id} variant="secondary" className="text-xs">
                          {product.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFavorite}
                    disabled={isToggling}
                    className="h-8 w-8 p-0"
                  >
                    <Heart 
                      className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                    />
                  </Button>
                  <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600">
                    <Link href={`/marketplace/vendor/${vendor.id}`}>
                      View Menu
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`group hover:shadow-lg transition-shadow duration-300 overflow-hidden ${className}`}>
      <div className="relative">
        {/* Cover Image */}
        <div className="relative aspect-video bg-gradient-to-br from-orange-100 to-green-100 overflow-hidden">
          <Image
            src={vendor.coverImage || "/api/placeholder/400/240"}
            alt={vendor.businessName}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
          
          {/* Badges */}
          <div className="absolute top-4 left-4 flex space-x-2">
            <Badge className="bg-green-500 text-white">
              <Clock className="w-3 h-3 mr-1" />
              25-35 min
            </Badge>
            {showDistance && vendor.distance && (
              <Badge className="bg-blue-500 text-white">
                <Navigation className="w-3 h-3 mr-1" />
                {vendor.distance.toFixed(1)} km
              </Badge>
            )}
          </div>

          {/* Favorite Button */}
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFavorite}
              disabled={isToggling}
              className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
            >
              <Heart 
                className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
              />
            </Button>
          </div>
        </div>

        {/* Logo */}
        <div className="absolute -bottom-6 left-4">
          <div className="relative w-12 h-12 bg-white rounded-lg shadow-lg border-2 border-white overflow-hidden">
            <Image
              src={vendor.logo || "/api/placeholder/48/48"}
              alt={vendor.businessName}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>

      <CardHeader className="pt-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-orange-600 transition-colors">
              {vendor.businessName}
            </h3>
            <p className="text-sm text-gray-600 mb-2">{vendor.businessType}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span>{vendor.rating.toFixed(1)}</span>
                <span>({vendor.reviewCount || vendor.totalReviews})</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{vendor.city}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span>${averagePrice.toFixed(0)} avg</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {vendor.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {vendor.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <ShoppingBag className="w-3 h-3" />
            <span>{vendor.orderCount || 0} orders</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-3 h-3" />
            <span>{vendor.favoriteCount || 0} favorites</span>
          </div>
          <div className="flex items-center space-x-1">
            <Truck className="w-3 h-3" />
            <span>$2.99 delivery</span>
          </div>
        </div>

        {/* Sample Products */}
        {vendor.products.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <ChefHat className="w-4 h-4 mr-1" />
              Popular Items
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {vendor.products.slice(0, 2).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-green-100 rounded overflow-hidden">
                      <Image
                        src={product.image || "/api/placeholder/32/32"}
                        alt={product.name}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-medium">{product.name}</span>
                      {product.isPopular && (
                        <Badge variant="secondary" className="text-xs">
                          Popular
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-orange-600 font-medium">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button asChild className="w-full bg-orange-500 hover:bg-orange-600">
          <Link href={`/marketplace/vendor/${vendor.id}`}>
            View Menu
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
