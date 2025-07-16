
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Update cart item
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const itemId = params.id
    const { quantity, notes } = await req.json()

    if (quantity !== undefined && quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    }

    // Get cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: true
      }
    })

    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    // Check if this is the user's cart
    if (cartItem.cart.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update item
    const updateData: any = {}
    if (quantity !== undefined) {
      updateData.quantity = quantity
      updateData.subtotal = quantity * cartItem.price
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: updateData
    })

    // Recalculate cart totals
    const updatedCart = await recalculateCart(cartItem.cartId)

    return NextResponse.json(updatedCart)
  } catch (error) {
    console.error('Error updating cart item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Remove item from cart
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const itemId = params.id

    // Get cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true
      }
    })

    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    // Check if this is the user's cart
    if (cartItem.cart.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Remove item
    await prisma.cartItem.delete({
      where: { id: itemId }
    })

    // Recalculate cart totals
    const updatedCart = await recalculateCart(cartItem.cartId)

    return NextResponse.json(updatedCart)
  } catch (error) {
    console.error('Error removing cart item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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
