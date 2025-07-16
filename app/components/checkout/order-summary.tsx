
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/lib/cart-context'
import { formatCurrency } from '@/lib/cart-utils'
import { 
  ShoppingCart, 
  Store, 
  Clock, 
  Truck, 
  Tag 
} from 'lucide-react'

export function OrderSummary() {
  const { state } = useCart()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items by Vendor */}
        <div className="space-y-4">
          {state.vendorGroups.map((vendorGroup) => (
            <div key={vendorGroup.vendor.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-sm">{vendorGroup.vendor.businessName}</span>
              </div>
              
              <div className="pl-6 space-y-1">
                {vendorGroup.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.quantity}x {item.product.name}
                    </span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Pricing Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({state.itemCount} items)</span>
            <span>{formatCurrency(state.subtotal)}</span>
          </div>
          
          {state.deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <Truck className="h-3 w-3" />
                Delivery Fee
              </span>
              <span>{formatCurrency(state.deliveryFee)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span>Tax (HST)</span>
            <span>{formatCurrency(state.tax)}</span>
          </div>
          
          {state.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Discount
              </span>
              <span>-{formatCurrency(state.discountAmount)}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between font-medium text-lg">
            <span>Total</span>
            <span>{formatCurrency(state.total)}</span>
          </div>
        </div>

        {/* Estimated Delivery */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Clock className="h-4 w-4" />
            <span>Estimated delivery: 30-45 minutes</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
