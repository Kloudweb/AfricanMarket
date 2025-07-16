
'use client'

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCart, useProductInCart } from "@/lib/cart-context"
import { 
  Plus, 
  Minus, 
  Clock, 
  Flame,
  ShoppingCart,
  Heart,
  Star,
  Leaf,
  Award
} from "lucide-react"
import { useSession } from 'next-auth/react'

interface ProductCardProps {
  product: {
    id: string
    name: string
    description?: string | null
    price: number
    category: string
    image?: string | null
    ingredients?: string | null
    isSpicy: boolean
    isAvailable?: boolean
    prepTime?: number | null
    rating?: number
    totalReviews?: number
    isPopular?: boolean
    dietaryInfo?: string[]
    vendor?: {
      id: string
      businessName: string
      logo?: string
      rating?: number
    }
    isFavorited?: boolean
  }
  className?: string
  showVendorInfo?: boolean
}

export function ProductCard({ 
  product, 
  className = '', 
  showVendorInfo = false 
}: ProductCardProps) {
  const { data: session } = useSession()
  const { addItem, updateItem, removeItem, state } = useCart()
  const { isInCart, quantity, cartItem } = useProductInCart(product.id)
  const [isFavorited, setIsFavorited] = useState(product.isFavorited || false)
  const [isToggling, setIsToggling] = useState(false)

  const addToCart = async () => {
    if (!session) {
      window.location.href = '/auth/signin'
      return
    }
    
    if (isInCart && cartItem) {
      await updateItem(cartItem.id, quantity + 1)
    } else {
      await addItem(product.id, 1)
    }
  }

  const removeFromCart = async () => {
    if (!cartItem) return
    
    if (quantity > 1) {
      await updateItem(cartItem.id, quantity - 1)
    } else {
      await removeItem(cartItem.id)
    }
  }

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!session) {
      window.location.href = '/auth/signin'
      return
    }

    setIsToggling(true)
    
    try {
      const method = isFavorited ? 'DELETE' : 'POST'
      const url = isFavorited 
        ? `/api/favorites/products/${product.id}`
        : '/api/favorites/products'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method === 'POST' ? JSON.stringify({ productId: product.id }) : undefined,
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

  return (
    <Card className={`group hover:shadow-lg transition-shadow duration-300 ${className}`}>
      <div className="relative">
        <div className="relative aspect-video bg-gradient-to-br from-orange-100 to-green-100 overflow-hidden rounded-t-lg">
          <Image
            src={product.image || "/api/placeholder/400/240"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {product.isPopular && (
              <Badge className="bg-yellow-500 text-white">
                <Award className="w-3 h-3 mr-1" />
                Popular
              </Badge>
            )}
            {product.isSpicy && (
              <Badge className="bg-red-500 text-white">
                <Flame className="w-3 h-3 mr-1" />
                Spicy
              </Badge>
            )}
            {product.prepTime && (
              <Badge className="bg-blue-500 text-white">
                <Clock className="w-3 h-3 mr-1" />
                {product.prepTime}m
              </Badge>
            )}
            {product.dietaryInfo?.includes('Vegetarian') && (
              <Badge className="bg-green-500 text-white">
                <Leaf className="w-3 h-3 mr-1" />
                Veg
              </Badge>
            )}
          </div>

          {/* Favorite Button */}
          <div className="absolute top-2 right-2">
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
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-gray-900 group-hover:text-orange-600 transition-colors">
              {product.name}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              {product.description}
            </CardDescription>
            
            {/* Rating */}
            {product.rating && product.totalReviews && (
              <div className="flex items-center space-x-1 mt-2">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                <span className="text-xs text-gray-500">({product.totalReviews})</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-orange-600">
              ${product.price.toFixed(2)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Vendor Info */}
        {showVendorInfo && product.vendor && (
          <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
            <div className="relative w-8 h-8 bg-white rounded-full overflow-hidden">
              <Image
                src={product.vendor.logo || '/api/placeholder/32/32'}
                alt={product.vendor.businessName}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{product.vendor.businessName}</p>
              {product.vendor.rating && (
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-xs text-gray-500">{product.vendor.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ingredients */}
        {product.ingredients && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
              Ingredients
            </p>
            <p className="text-sm text-gray-600 line-clamp-2">
              {product.ingredients}
            </p>
          </div>
        )}

        {/* Dietary Info */}
        {product.dietaryInfo && product.dietaryInfo.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.dietaryInfo.slice(0, 3).map((info) => (
              <Badge key={info} variant="secondary" className="text-xs">
                {info}
              </Badge>
            ))}
            {product.dietaryInfo.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{product.dietaryInfo.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Add to Cart */}
        <div className="flex items-center justify-between">
          {quantity === 0 ? (
            <Button 
              onClick={addToCart}
              disabled={state.loading || !product.isAvailable}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {!product.isAvailable ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          ) : (
            <div className="flex items-center space-x-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={removeFromCart}
                disabled={state.loading}
                className="h-8 w-8 p-0"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="font-medium">{quantity}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addToCart}
                disabled={state.loading || !product.isAvailable}
                className="h-8 w-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
