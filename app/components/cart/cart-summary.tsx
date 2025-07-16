
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useCart } from '@/lib/cart-context'
import { formatCurrency } from '@/lib/cart-utils'
import { 
  ShoppingCart, 
  Truck, 
  Package, 
  Tag, 
  X,
  Calculator,
  MapPin,
  Clock,
  CheckCircle
} from 'lucide-react'

interface CartSummaryProps {
  showPromoCode?: boolean
  showDeliveryToggle?: boolean
  className?: string
}

export function CartSummary({ 
  showPromoCode = true, 
  showDeliveryToggle = true,
  className = '' 
}: CartSummaryProps) {
  const { state, applyPromoCode, removePromoCode, updateDeliverySettings } = useCart()
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) return
    
    setPromoLoading(true)
    try {
      await applyPromoCode(promoCode.trim())
      setPromoCode('')
    } finally {
      setPromoLoading(false)
    }
  }

  const handleRemovePromoCode = async () => {
    await removePromoCode()
  }

  const handleDeliveryToggle = async (isDelivery: boolean) => {
    await updateDeliverySettings({ isDelivery })
  }

  if (state.items.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Delivery Toggle */}
        {showDeliveryToggle && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="delivery-toggle" className="flex items-center gap-2">
                {state.isDelivery ? (
                  <Truck className="h-4 w-4" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
                {state.isDelivery ? 'Delivery' : 'Pickup'}
              </Label>
              <Switch
                id="delivery-toggle"
                checked={state.isDelivery}
                onCheckedChange={handleDeliveryToggle}
                disabled={state.loading}
              />
            </div>
            
            {state.isDelivery && state.deliveryAddress && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Delivery Address</p>
                    <p className="text-sm text-blue-700">{state.deliveryAddress}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Promo Code */}
        {showPromoCode && (
          <div className="space-y-3">
            {!state.appliedPromoCode ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Promo Code</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleApplyPromoCode()}
                    disabled={promoLoading}
                  />
                  <Button
                    onClick={handleApplyPromoCode}
                    disabled={!promoCode.trim() || promoLoading}
                    size="sm"
                  >
                    <Tag className="h-4 w-4 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    {state.appliedPromoCode}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePromoCode}
                  className="text-green-700 hover:text-green-900"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Order Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Subtotal ({state.itemCount} items)
            </span>
            <span>{formatCurrency(state.subtotal)}</span>
          </div>
          
          {state.isDelivery && state.deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
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
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Discount
              </span>
              <span>-{formatCurrency(state.discountAmount)}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between text-base font-medium">
            <span>Total</span>
            <span>{formatCurrency(state.total)}</span>
          </div>
        </div>

        {/* Vendor Breakdown */}
        {state.vendorGroups.length > 1 && (
          <div className="space-y-3">
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Breakdown by Vendor</h4>
              {state.vendorGroups.map((vendorGroup) => (
                <div key={vendorGroup.vendor.id} className="flex justify-between text-sm">
                  <span className="truncate">{vendorGroup.vendor.businessName}</span>
                  <span>{formatCurrency(vendorGroup.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Minimum Order Warnings */}
        {state.vendorGroups.some(group => 
          group.minimumOrderAmount > 0 && group.subtotal < group.minimumOrderAmount
        ) && (
          <div className="space-y-2">
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-amber-800">Minimum Order Required</h4>
              {state.vendorGroups
                .filter(group => group.minimumOrderAmount > 0 && group.subtotal < group.minimumOrderAmount)
                .map((group) => (
                  <div key={group.vendor.id} className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>{group.vendor.businessName}</strong>: Add {formatCurrency(group.minimumOrderAmount - group.subtotal)} more
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Estimated Delivery Time */}
        {state.isDelivery && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-700">
              Estimated delivery: 30-45 minutes
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
