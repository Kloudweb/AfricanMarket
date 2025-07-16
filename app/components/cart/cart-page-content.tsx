
'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyCart } from './empty-cart'
import { VendorCartGroup } from './vendor-cart-group'
import { CartSummary } from './cart-summary'
import { useCart } from '@/lib/cart-context'
import { formatCurrency } from '@/lib/cart-utils'
import { 
  ShoppingCart, 
  ArrowRight, 
  CreditCard, 
  Lock,
  Users,
  Clock,
  AlertTriangle
} from 'lucide-react'

export function CartPageContent() {
  const { data: session } = useSession()
  const { state, clearCart } = useCart()

  // Show sign-in prompt if user is not logged in
  if (!session) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Sign in to view your cart</h2>
            <p className="text-gray-600 mb-6">
              You need to be signed in to add items to your cart and place orders.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild>
                <Link href="/auth/signin">
                  Sign In
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/auth/signup">
                  Create Account
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show empty cart if no items
  if (state.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Cart</h1>
          <p className="text-gray-600">Review your items and proceed to checkout</p>
        </div>
        <EmptyCart />
      </div>
    )
  }

  const hasMinimumOrderIssues = state.vendorGroups.some(group => 
    group.minimumOrderAmount > 0 && group.subtotal < group.minimumOrderAmount
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Cart</h1>
          <p className="text-gray-600">
            {state.itemCount} {state.itemCount === 1 ? 'item' : 'items'} from {state.vendorGroups.length} {state.vendorGroups.length === 1 ? 'vendor' : 'vendors'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={clearCart} disabled={state.loading}>
            Clear Cart
          </Button>
          
          <Link href="/marketplace">
            <Button variant="outline">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loading State */}
          {state.loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          )}

          {/* Vendor Groups */}
          {state.vendorGroups.map((vendorGroup) => (
            <VendorCartGroup
              key={vendorGroup.vendor.id}
              vendorGroup={vendorGroup}
              isDelivery={state.isDelivery}
            />
          ))}

          {/* Special Instructions */}
          {state.specialInstructions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{state.specialInstructions}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cart Summary */}
        <div className="space-y-6">
          <CartSummary />
          
          {/* Checkout Button */}
          <div className="space-y-4">
            {hasMinimumOrderIssues && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Minimum Order Required
                    </p>
                    <p className="text-sm text-amber-700">
                      Some vendors require a minimum order amount. Please add more items to proceed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button 
              size="lg" 
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={hasMinimumOrderIssues || state.loading}
              asChild={!hasMinimumOrderIssues}
            >
              {hasMinimumOrderIssues ? (
                <span>
                  <Lock className="mr-2 h-5 w-5" />
                  Complete Minimum Orders
                </span>
              ) : (
                <Link href="/checkout">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Secure checkout powered by Stripe
              </p>
            </div>
          </div>

          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>Estimated delivery: 30-45 minutes</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4 text-gray-500" />
                <span>Secure payment processing</span>
              </div>
              
              <div className="pt-3 border-t">
                <p className="text-xs text-gray-600">
                  By proceeding to checkout, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Actions for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-lg font-bold">{formatCurrency(state.total)}</p>
          </div>
          <Button 
            size="lg" 
            className="bg-orange-500 hover:bg-orange-600"
            disabled={hasMinimumOrderIssues || state.loading}
            asChild={!hasMinimumOrderIssues}
          >
            {hasMinimumOrderIssues ? (
              <span>Complete Minimum Orders</span>
            ) : (
              <Link href="/checkout">
                Checkout
              </Link>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
