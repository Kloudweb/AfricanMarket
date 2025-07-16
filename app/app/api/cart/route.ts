
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get user's cart
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
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
                    province: true,
                    isActive: true,
                    verificationStatus: true
                  }
                }
              }
            }
          },
          orderBy: {
            addedAt: 'desc'
          }
        },
        appliedPromo: true
      }
    })

    if (!cart) {
      return NextResponse.json({
        items: [],
        subtotal: 0,
        tax: 0,
        deliveryFee: 0,
        total: 0,
        discountAmount: 0,
        itemCount: 0,
        vendorGroups: []
      })
    }

    // Group items by vendor
    const vendorGroups = cart.items.reduce((acc: any, item: any) => {
      const vendorId = item.vendorId
      if (!acc[vendorId]) {
        acc[vendorId] = {
          vendor: item.product.vendor,
          items: [],
          subtotal: 0,
          deliveryFee: item.product.vendor.deliveryFee || 0,
          minimumOrderAmount: item.product.vendor.minimumOrderAmount || 0
        }
      }
      acc[vendorId].items.push(item)
      acc[vendorId].subtotal += item.subtotal
      return acc
    }, {})

    const response = {
      id: cart.id,
      items: cart.items,
      subtotal: cart.subtotal,
      tax: cart.tax,
      deliveryFee: cart.deliveryFee,
      total: cart.total,
      discountAmount: cart.discountAmount,
      appliedPromoCode: cart.appliedPromoCode,
      appliedPromo: cart.appliedPromo,
      isDelivery: cart.isDelivery,
      deliveryAddress: cart.deliveryAddress,
      specialInstructions: cart.specialInstructions,
      itemCount: cart.items.length,
      vendorGroups: Object.values(vendorGroups),
      updatedAt: cart.updatedAt
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching cart:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update cart delivery settings
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      isDelivery, 
      deliveryAddress, 
      deliveryLatitude, 
      deliveryLongitude, 
      specialInstructions 
    } = await req.json()

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id }
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: session.user.id,
          isDelivery: isDelivery ?? true,
          deliveryAddress,
          deliveryLatitude,
          deliveryLongitude,
          specialInstructions
        }
      })
    } else {
      cart = await prisma.cart.update({
        where: { id: cart.id },
        data: {
          isDelivery: isDelivery ?? cart.isDelivery,
          deliveryAddress: deliveryAddress ?? cart.deliveryAddress,
          deliveryLatitude: deliveryLatitude ?? cart.deliveryLatitude,
          deliveryLongitude: deliveryLongitude ?? cart.deliveryLongitude,
          specialInstructions: specialInstructions ?? cart.specialInstructions
        }
      })
    }

    // Recalculate cart totals
    const updatedCart = await recalculateCart(cart.id)

    return NextResponse.json(updatedCart)
  } catch (error) {
    console.error('Error updating cart:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Clear cart
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id }
    })

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id }
      })

      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          subtotal: 0,
          tax: 0,
          deliveryFee: 0,
          total: 0,
          discountAmount: 0,
          appliedPromoCode: null
        }
      })
    }

    return NextResponse.json({ message: 'Cart cleared successfully' })
  } catch (error) {
    console.error('Error clearing cart:', error)
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
              vendor: true
            }
          }
        }
      },
      appliedPromo: true
    }
  })

  return updatedCart
}
