
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useCart } from '@/lib/cart-context'
import { formatCurrency } from '@/lib/cart-utils'
import { 
  Plus, 
  Minus, 
  X, 
  MessageSquare,
  Flame,
  Clock,
  Edit2,
  Check,
  AlertCircle
} from 'lucide-react'

interface CartItemProps {
  item: {
    id: string
    productId: string
    vendorId: string
    quantity: number
    price: number
    subtotal: number
    notes?: string
    product: {
      id: string
      name: string
      description?: string
      image?: string
      price: number
      isSpicy?: boolean
      prepTime?: number
      vendor: {
        id: string
        businessName: string
        logo?: string
      }
    }
  }
  showVendorInfo?: boolean
  className?: string
}

export function CartItem({ item, showVendorInfo = false, className = '' }: CartItemProps) {
  const { updateItem, removeItem, state } = useCart()
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState(item.notes || '')

  const handleUpdateQuantity = async (newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeItem(item.id)
    } else {
      await updateItem(item.id, newQuantity)
    }
  }

  const handleSaveNotes = async () => {
    await updateItem(item.id, item.quantity, notes)
    setIsEditingNotes(false)
  }

  const handleCancelNotes = () => {
    setNotes(item.notes || '')
    setIsEditingNotes(false)
  }

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Product Image */}
          <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            <Image
              src={item.product.image || '/api/placeholder/80/80'}
              alt={item.product.name}
              fill
              className="object-cover"
            />
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-lg text-gray-900">{item.product.name}</h3>
                
                {item.product.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {item.product.description}
                  </p>
                )}

                {/* Product Badges */}
                <div className="flex items-center gap-2 mt-2">
                  {item.product.isSpicy && (
                    <Badge variant="secondary" className="text-xs">
                      <Flame className="w-3 h-3 mr-1" />
                      Spicy
                    </Badge>
                  )}
                  
                  {item.product.prepTime && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.product.prepTime}m
                    </Badge>
                  )}
                </div>

                {/* Vendor Info */}
                {showVendorInfo && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded-lg">
                    <div className="relative h-6 w-6 rounded-full overflow-hidden bg-white">
                      <Image
                        src={item.product.vendor.logo || '/api/placeholder/24/24'}
                        alt={item.product.vendor.businessName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {item.product.vendor.businessName}
                    </span>
                  </div>
                )}
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.id)}
                disabled={state.loading}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Price and Quantity Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateQuantity(item.quantity - 1)}
                    disabled={state.loading}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  
                  <span className="font-medium w-8 text-center">
                    {item.quantity}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateQuantity(item.quantity + 1)}
                    disabled={state.loading}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <div className="text-sm text-gray-500">
                  {formatCurrency(item.price)} each
                </div>
              </div>

              <div className="text-right">
                <div className="font-medium text-lg">
                  {formatCurrency(item.subtotal)}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="mt-4">
              {!isEditingNotes ? (
                <div className="flex items-center gap-2">
                  {item.notes ? (
                    <div className="flex-1 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-orange-800">{item.notes}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 text-sm text-gray-500">
                      No special instructions
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingNotes(true)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add special instructions..."
                    className="min-h-[80px]"
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelNotes}
                      disabled={state.loading}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={state.loading}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
