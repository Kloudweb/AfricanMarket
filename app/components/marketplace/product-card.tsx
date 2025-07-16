
'use client'

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  Minus, 
  Clock, 
  Flame,
  ShoppingCart
} from "lucide-react"

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
    prepTime?: number | null
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const [quantity, setQuantity] = useState(0)

  const addToCart = () => {
    setQuantity(prev => prev + 1)
    // TODO: Implement cart functionality
  }

  const removeFromCart = () => {
    setQuantity(prev => Math.max(0, prev - 1))
    // TODO: Implement cart functionality
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        <div className="relative aspect-video bg-gradient-to-br from-orange-100 to-green-100 overflow-hidden rounded-t-lg">
          <Image
            src={product.image || "/api/placeholder/400/240"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex space-x-1">
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
          </div>
        </div>
      </div>

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-gray-900 group-hover:text-orange-600 transition-colors">
              {product.name}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              {product.description}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-orange-600">
              ${product.price.toFixed(2)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
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

        {/* Add to Cart */}
        <div className="flex items-center justify-between">
          {quantity === 0 ? (
            <Button 
              onClick={addToCart}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          ) : (
            <div className="flex items-center space-x-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={removeFromCart}
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
