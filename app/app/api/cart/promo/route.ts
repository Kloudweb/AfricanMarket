
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Apply promo code
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await req.json()

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })
    }

    // Get cart
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: true
              }
            }
          }
        }
      }
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Get promo code
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        vendor: true
      }
    })

    if (!promoCode) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 })
    }

    // Validate promo code
    const validationResult = await validatePromoCode(promoCode, cart, session.user.id)
    if (!validationResult.valid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 })
    }

    // Apply promo code
    const updatedCart = await prisma.cart.update({
      where: { id: cart.id },
      data: {
        appliedPromoCode: promoCode.code
      }
    })

    // Recalculate cart totals
    const finalCart = await recalculateCart(cart.id)

    return NextResponse.json({
      message: 'Promo code applied successfully',
      cart: finalCart,
      discount: validationResult.discountAmount
    })
  } catch (error) {
    console.error('Error applying promo code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Remove promo code
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get cart
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id }
    })

    if (!cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
    }

    // Remove promo code
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        appliedPromoCode: null
      }
    })

    // Recalculate cart totals
    const updatedCart = await recalculateCart(cart.id)

    return NextResponse.json({
      message: 'Promo code removed successfully',
      cart: updatedCart
    })
  } catch (error) {
    console.error('Error removing promo code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Validate promo code
async function validatePromoCode(promoCode: any, cart: any, userId: string) {
  const now = new Date()

  // Check if promo code is active
  if (!promoCode.isActive) {
    return { valid: false, error: 'Promo code is not active' }
  }

  // Check validity period
  if (promoCode.validUntil && promoCode.validUntil < now) {
    return { valid: false, error: 'Promo code has expired' }
  }

  if (promoCode.validFrom > now) {
    return { valid: false, error: 'Promo code is not yet valid' }
  }

  // Check usage limits
  if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
    return { valid: false, error: 'Promo code usage limit reached' }
  }

  // Check per-user limits
  if (promoCode.userLimit) {
    const userUsageCount = await prisma.promoCodeUsage.count({
      where: {
        userId: userId,
        promoCodeId: promoCode.id
      }
    })

    if (userUsageCount >= promoCode.userLimit) {
      return { valid: false, error: 'You have reached the usage limit for this promo code' }
    }
  }

  // Check minimum order amount
  if (promoCode.minimumOrderAmount && cart.subtotal < promoCode.minimumOrderAmount) {
    return { 
      valid: false, 
      error: `Minimum order amount of $${promoCode.minimumOrderAmount.toFixed(2)} required` 
    }
  }

  // Check vendor-specific codes
  if (promoCode.vendorId) {
    const hasVendorItems = cart.items.some((item: any) => item.vendorId === promoCode.vendorId)
    if (!hasVendorItems) {
      return { 
        valid: false, 
        error: `This promo code is only valid for ${promoCode.vendor.businessName}` 
      }
    }
  }

  // Calculate discount amount
  let discountAmount = 0
  if (promoCode.type === 'PERCENTAGE') {
    discountAmount = (cart.subtotal * promoCode.discountValue) / 100
    if (promoCode.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, promoCode.maxDiscountAmount)
    }
  } else if (promoCode.type === 'FIXED_AMOUNT') {
    discountAmount = promoCode.discountValue
  } else if (promoCode.type === 'FREE_DELIVERY') {
    discountAmount = cart.deliveryFee
  }

  return { valid: true, discountAmount }
}

// Helper function to recalculate cart totals
async function recalculateCart(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: {
            include: {
              vendor: true
            }
          }
        }
      },
      appliedPromo: true
    }
  })

  if (!cart) return null

  // Calculate subtotal
  const subtotal = cart.items.reduce((sum: number, item: any) => sum + item.subtotal, 0)

  // Calculate delivery fee (simplified - will be enhanced with distance calculation)
  const deliveryFee = cart.isDelivery ? 
    cart.items.reduce((sum: number, item: any) => {
      const vendorDeliveryFee = item.product.vendor.deliveryFee || 0
      return sum + vendorDeliveryFee
    }, 0) : 0

  // Calculate tax (15% HST for Newfoundland)
  const taxRate = 0.15
  const tax = subtotal * taxRate

  // Calculate discount
  let discountAmount = 0
  if (cart.appliedPromo) {
    if (cart.appliedPromo.type === 'PERCENTAGE') {
      discountAmount = (subtotal * cart.appliedPromo.discountValue) / 100
      if (cart.appliedPromo.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, cart.appliedPromo.maxDiscountAmount)
      }
    } else if (cart.appliedPromo.type === 'FIXED_AMOUNT') {
      discountAmount = cart.appliedPromo.discountValue
    } else if (cart.appliedPromo.type === 'FREE_DELIVERY') {
      discountAmount = deliveryFee
    }
  }

  const total = subtotal + tax + deliveryFee - discountAmount

  // Update cart
  const updatedCart = await prisma.cart.update({
    where: { id: cartId },
    data: {
      subtotal,
      tax,
      deliveryFee,
      total,
      discountAmount
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              vendor: {
                select: {
                  id: true,
                  businessName: true,
                  logo: true,
                  deliveryFee: true,
                  minimumOrderAmount: true,
                  address: true,
                  city: true,
                  province: true
                }
              }
            }
          }
        }
      },
      appliedPromo: true
    }
  })

  return updatedCart
}
