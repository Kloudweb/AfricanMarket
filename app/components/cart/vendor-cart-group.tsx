
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CartItem } from './cart-item'
import { formatCurrency } from '@/lib/cart-utils'
import { 
  Store, 
  MapPin, 
  Clock, 
  Truck, 
  AlertCircle,
  Star,
  Phone,
  ExternalLink
} from 'lucide-react'

interface VendorCartGroupProps {
  vendorGroup: {
    vendor: {
      id: string
      businessName: string
      logo?: string
      deliveryFee?: number
      minimumOrderAmount?: number
      address: string
      city: string
      province: string
      phone?: string
      rating?: number
      totalReviews?: number
    }
    items: any[]
    subtotal: number
    deliveryFee: number
    minimumOrderAmount: number
  }
  isDelivery?: boolean
  className?: string
}

export function VendorCartGroup({ 
  vendorGroup, 
  isDelivery = true, 
  className = '' 
}: VendorCartGroupProps) {
  const { vendor, items, subtotal, deliveryFee, minimumOrderAmount } = vendorGroup
  
  const hasMinimumOrder = minimumOrderAmount > 0
  const meetsMinimumOrder = subtotal >= minimumOrderAmount
  const remainingForMinimum = hasMinimumOrder && !meetsMinimumOrder ? 
    minimumOrderAmount - subtotal : 0

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Vendor Logo */}
            <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={vendor.logo || '/api/placeholder/48/48'}
                alt={vendor.businessName}
                fill
                className="object-cover"
              />
            </div>

            {/* Vendor Info */}
            <div>
              <h3 className="font-semibold text-lg">{vendor.businessName}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-3 w-3" />
                <span>{vendor.city}, {vendor.province}</span>
              </div>
              
              {vendor.rating && vendor.totalReviews && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium">{vendor.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">({vendor.totalReviews})</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {vendor.phone && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`tel:${vendor.phone}`}>
                  <Phone className="h-4 w-4" />
                </Link>
              </Button>
            )}
            
            <Button variant="outline" size="sm" asChild>
              <Link href={`/marketplace/vendor/${vendor.id}`}>
                <Store className="h-4 w-4 mr-1" />
                View Store
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Minimum Order Warning */}
        {hasMinimumOrder && !meetsMinimumOrder && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Minimum Order Required
                </p>
                <p className="text-sm text-amber-700">
                  Add {formatCurrency(remainingForMinimum)} more to meet the minimum order of {formatCurrency(minimumOrderAmount)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Info */}
        {isDelivery && (
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Truck className="h-4 w-4" />
              <span>Delivery: {formatCurrency(deliveryFee)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>30-45 min</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Cart Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              showVendorInfo={false}
            />
          ))}
        </div>

        <Separator />

        {/* Vendor Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({items.length} items)</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          
          {isDelivery && deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Delivery Fee</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span>Tax (HST)</span>
            <span>{formatCurrency(subtotal * 0.15)}</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between font-medium">
            <span>Vendor Total</span>
            <span>{formatCurrency(subtotal + (isDelivery ? deliveryFee : 0) + (subtotal * 0.15))}</span>
          </div>
        </div>

        {/* Add More Items */}
        <div className="pt-2">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={`/marketplace/vendor/${vendor.id}`}>
              <Store className="h-4 w-4 mr-2" />
              Add More Items from {vendor.businessName}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
