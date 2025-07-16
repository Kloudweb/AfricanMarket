
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Add item to cart
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, quantity = 1, notes } = await req.json()

    if (!productId || quantity < 1) {
      return NextResponse.json({ error: 'Invalid product or quantity' }, { status: 400 })
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            isActive: true,
            verificationStatus: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!product.isAvailable) {
      return NextResponse.json({ error: 'Product is not available' }, { status: 400 })
    }

    if (!product.vendor.isActive || product.vendor.verificationStatus !== 'VERIFIED') {
      return NextResponse.json({ error: 'Vendor is not available' }, { status: 400 })
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id }
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: session.user.id
        }
      })
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: productId
      }
    })

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity
      const subtotal = newQuantity * product.price

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          subtotal,
          notes: notes || existingItem.notes
        }
      })
    } else {
      // Add new item
      const subtotal = quantity * product.price

      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          vendorId: product.vendorId,
          quantity,
          price: product.price,
          subtotal,
          notes
        }
      })
    }

    // Recalculate cart totals
    const updatedCart = await recalculateCart(cart.id)

    return NextResponse.json(updatedCart)
  } catch (error) {
    console.error('Error adding item to cart:', error)
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
