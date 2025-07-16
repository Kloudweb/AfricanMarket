
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/lib/cart-context'
import { formatCurrency } from '@/lib/cart-utils'
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  Store,
  ArrowRight,
  ShoppingBag
} from 'lucide-react'

interface CartSidebarProps {
  children?: React.ReactNode
}

export function CartSidebar({ children }: CartSidebarProps) {
  const { state, updateItem, removeItem } = useCart()
  const [isOpen, setIsOpen] = useState(false)

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeItem(itemId)
    } else {
      await updateItem(itemId, newQuantity)
    }
  }

  const trigger = children || (
    <Button variant="outline" size="sm" className="relative">
      <ShoppingCart className="h-4 w-4" />
      {state.itemCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {state.itemCount}
        </Badge>
      )}
    </Button>
  )

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Your Cart ({state.itemCount} items)
          </SheetTitle>
        </SheetHeader>

        {state.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-gray-100 rounded-full p-4 mb-4">
              <ShoppingCart className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-500 mb-4">Add some delicious items to get started!</p>
            <Button onClick={() => setIsOpen(false)} asChild>
              <Link href="/marketplace">
                Browse Menu
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6">
                {state.vendorGroups.map((vendorGroup) => (
                  <div key={vendorGroup.vendor.id} className="space-y-3">
                    {/* Vendor Header */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="relative h-8 w-8 rounded-full overflow-hidden bg-white">
                        <Image
                          src={vendorGroup.vendor.logo || '/api/placeholder/32/32'}
                          alt={vendorGroup.vendor.businessName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{vendorGroup.vendor.businessName}</h4>
                        <p className="text-xs text-gray-500">
                          {vendorGroup.vendor.city}, {vendorGroup.vendor.province}
                        </p>
                      </div>
                      <Store className="h-4 w-4 text-gray-400" />
                    </div>

                    {/* Vendor Items */}
                    <div className="space-y-3">
                      {vendorGroup.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                          <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={item.product.image || '/api/placeholder/48/48'}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-sm truncate">{item.product.name}</h5>
                            <p className="text-xs text-gray-500">{formatCurrency(item.price)}</p>
                            {item.notes && (
                              <p className="text-xs text-orange-600 mt-1">Note: {item.notes}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={state.loading}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            
                            <span className="text-sm font-medium w-6 text-center">
                              {item.quantity}
                            </span>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              disabled={state.loading}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            disabled={state.loading}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Vendor Minimum Order Warning */}
                    {vendorGroup.minimumOrderAmount > 0 && vendorGroup.subtotal < vendorGroup.minimumOrderAmount && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          Add {formatCurrency(vendorGroup.minimumOrderAmount - vendorGroup.subtotal)} more 
                          for minimum order from {vendorGroup.vendor.businessName}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-4 pt-4 border-t">
              {/* Cart Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(state.subtotal)}</span>
                </div>
                
                {state.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span>{formatCurrency(state.deliveryFee)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>{formatCurrency(state.tax)}</span>
                </div>
                
                {state.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(state.discountAmount)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(state.total)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => setIsOpen(false)}
                  asChild
                >
                  <Link href="/cart">
                    View Cart
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                
                <Button 
                  className="w-full bg-orange-500 hover:bg-orange-600" 
                  onClick={() => setIsOpen(false)}
                  asChild
                >
                  <Link href="/checkout">
                    Checkout
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
