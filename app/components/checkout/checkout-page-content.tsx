
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCart } from '@/lib/cart-context'
import { formatCurrency } from '@/lib/cart-utils'
import { AddressSelector } from './address-selector'
import { PaymentMethodSelector } from './payment-method-selector'
import { OrderSummary } from './order-summary'
import { 
  ShoppingCart, 
  ArrowLeft, 
  CreditCard, 
  MapPin, 
  Clock, 
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

export function CheckoutPageContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const { state, clearCart } = useCart()
  const [selectedAddress, setSelectedAddress] = useState<string>('')
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery')
  const [paymentMethod, setPaymentMethod] = useState<string>('card')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin?callbackUrl=/checkout')
      return
    }
    
    if (state.items.length === 0) {
      router.push('/cart')
      return
    }
    
    setDeliveryMethod(state.isDelivery ? 'delivery' : 'pickup')
  }, [session, state.items.length, state.isDelivery, router])

  const hasMinimumOrderIssues = state.vendorGroups.some(group => 
    group.minimumOrderAmount > 0 && group.subtotal < group.minimumOrderAmount
  )

  const handlePlaceOrder = async () => {
    if (!selectedAddress && deliveryMethod === 'delivery') {
      alert('Please select a delivery address')
      return
    }

    if (!paymentMethod) {
      alert('Please select a payment method')
      return
    }

    setIsProcessing(true)
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod,
          deliveryAddress: selectedAddress,
          isDelivery: deliveryMethod === 'delivery',
          specialInstructions,
          addressId: selectedAddress
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setOrderSuccess(true)
        await clearCart()
        
        // Redirect to order confirmation after a short delay
        setTimeout(() => {
          router.push(`/orders/${result.orders[0].id}`)
        }, 2000)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to process order')
      }
    } catch (error) {
      console.error('Error placing order:', error)
      alert('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!session) {
    return null
  }

  if (state.items.length === 0) {
    return null
  }

  if (orderSuccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Placed Successfully!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your order. You'll receive a confirmation email shortly.
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-sm text-gray-500">Redirecting to order details...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Review your order and complete your purchase</p>
        </div>
        
        <Link href="/cart">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Button>
        </Link>
      </div>

      {/* Minimum Order Warning */}
      {hasMinimumOrderIssues && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-amber-800">Minimum Order Required</h3>
              <p className="text-sm text-amber-700 mt-1">
                Some vendors require a minimum order amount. Please return to your cart and add more items.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Checkout Form */}
        <div className="space-y-6">
          {/* Delivery Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Delivery Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={deliveryMethod} onValueChange={(value: 'delivery' | 'pickup') => setDeliveryMethod(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="delivery" id="delivery" />
                  <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Delivery</p>
                        <p className="text-sm text-gray-600">30-45 minutes</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatCurrency(state.deliveryFee)}
                      </span>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pickup" id="pickup" />
                  <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Pickup</p>
                        <p className="text-sm text-gray-600">15-25 minutes</p>
                      </div>
                      <span className="text-sm text-green-600">Free</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Address Selection */}
          {deliveryMethod === 'delivery' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AddressSelector 
                  selectedAddress={selectedAddress}
                  onAddressSelect={setSelectedAddress}
                />
              </CardContent>
            </Card>
          )}

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentMethodSelector 
                selectedMethod={paymentMethod}
                onMethodSelect={setPaymentMethod}
              />
            </CardContent>
          </Card>

          {/* Special Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Special Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any special instructions for your order..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-6">
          <OrderSummary />

          {/* Place Order Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handlePlaceOrder}
                disabled={hasMinimumOrderIssues || isProcessing || (!selectedAddress && deliveryMethod === 'delivery')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg font-medium"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing Order...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Place Order • {formatCurrency(state.total)}
                  </>
                )}
              </Button>

              <div className="mt-4 text-center text-xs text-gray-500">
                <p>
                  By placing this order, you agree to our Terms of Service and Privacy Policy.
                  Your payment is secure and protected.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" />
                <span>Your payment information is secure and encrypted</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
