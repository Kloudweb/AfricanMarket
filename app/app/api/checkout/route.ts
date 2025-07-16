
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Process checkout
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      paymentMethod,
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
      isDelivery,
      specialInstructions,
      addressId
    } = await req.json()

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
        },
        appliedPromo: true
      }
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Get delivery address if addressId provided
    let finalDeliveryAddress = deliveryAddress
    let finalDeliveryLatitude = deliveryLatitude
    let finalDeliveryLongitude = deliveryLongitude

    if (addressId) {
      const savedAddress = await prisma.savedAddress.findUnique({
        where: { id: addressId }
      })

      if (savedAddress && savedAddress.userId === session.user.id) {
        finalDeliveryAddress = `${savedAddress.address}, ${savedAddress.city}, ${savedAddress.province} ${savedAddress.postalCode}`
        finalDeliveryLatitude = savedAddress.latitude
        finalDeliveryLongitude = savedAddress.longitude
      }
    }

    // Group items by vendor
    const vendorGroups = cart.items.reduce((acc: any, item: any) => {
      const vendorId = item.vendorId
      if (!acc[vendorId]) {
        acc[vendorId] = {
          vendor: item.product.vendor,
          items: []
        }
      }
      acc[vendorId].items.push(item)
      return acc
    }, {})

    const createdOrders = []

    // Create orders for each vendor
    for (const vendorId in vendorGroups) {
      const vendorGroup = vendorGroups[vendorId]
      
      // Calculate vendor-specific totals
      const vendorSubtotal = vendorGroup.items.reduce((sum: number, item: any) => sum + item.subtotal, 0)
      const vendorTax = vendorSubtotal * 0.15 // 15% HST for Newfoundland
      
      // Calculate delivery fee for this vendor
      let vendorDeliveryFee = 0
      if (isDelivery) {
        vendorDeliveryFee = await calculateVendorDeliveryFee(
          vendorGroup.vendor,
          finalDeliveryLatitude,
          finalDeliveryLongitude
        )
      }

      // Calculate discount for this vendor
      let vendorDiscount = 0
      if (cart.appliedPromo && cart.appliedPromo.vendorId === vendorId) {
        if (cart.appliedPromo.type === 'PERCENTAGE') {
          vendorDiscount = (vendorSubtotal * cart.appliedPromo.discountValue) / 100
          if (cart.appliedPromo.maxDiscountAmount) {
            vendorDiscount = Math.min(vendorDiscount, cart.appliedPromo.maxDiscountAmount)
          }
        } else if (cart.appliedPromo.type === 'FIXED_AMOUNT') {
          vendorDiscount = cart.appliedPromo.discountValue
        } else if (cart.appliedPromo.type === 'FREE_DELIVERY') {
          vendorDiscount = vendorDeliveryFee
        }
      }

      const vendorTotal = vendorSubtotal + vendorTax + vendorDeliveryFee - vendorDiscount

      // Generate order number
      const orderNumber = await generateOrderNumber()

      // Create main order
      const order = await prisma.order.create({
        data: {
          customerId: session.user.id,
          vendorId: vendorId,
          orderNumber,
          status: 'PENDING',
          subtotal: vendorSubtotal,
          deliveryFee: vendorDeliveryFee,
          tax: vendorTax,
          totalAmount: vendorTotal,
          paymentMethod,
          specialInstructions,
          isDelivery,
          deliveryAddress: finalDeliveryAddress,
          deliveryLatitude: finalDeliveryLatitude,
          deliveryLongitude: finalDeliveryLongitude,
          estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000) // 45 minutes from now
        }
      })

      // Create order items
      for (const cartItem of vendorGroup.items) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            price: cartItem.price,
            subtotal: cartItem.subtotal,
            notes: cartItem.notes
          }
        })
      }

      // Create vendor order
      await prisma.vendorOrder.create({
        data: {
          orderId: order.id,
          vendorId: vendorId,
          orderNumber: `${orderNumber}-${vendorId.slice(-4)}`,
          status: 'PENDING',
          subtotal: vendorSubtotal,
          tax: vendorTax,
          deliveryFee: vendorDeliveryFee,
          total: vendorTotal,
          discountAmount: vendorDiscount,
          specialInstructions,
          estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000),
          items: {
            create: vendorGroup.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              notes: item.notes
            }))
          }
        }
      })

      // Create tax calculation record
      await prisma.taxCalculation.create({
        data: {
          orderId: order.id,
          province: 'Newfoundland and Labrador',
          city: 'St. John\'s',
          postalCode: 'A1C',
          subtotal: vendorSubtotal,
          hst: vendorTax,
          totalTax: vendorTax,
          taxRate: 0.15
        }
      })

      // Record promo code usage
      if (cart.appliedPromo && cart.appliedPromo.vendorId === vendorId) {
        await prisma.promoCodeUsage.create({
          data: {
            userId: session.user.id,
            promoCodeId: cart.appliedPromo.id,
            orderId: order.id,
            discountAmount: vendorDiscount
          }
        })

        // Update promo code usage count
        await prisma.promoCode.update({
          where: { id: cart.appliedPromo.id },
          data: {
            usageCount: { increment: 1 }
          }
        })
      }

      createdOrders.push(order)
    }

    // Clear cart
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

    return NextResponse.json({
      success: true,
      orders: createdOrders,
      message: 'Orders created successfully'
    })
  } catch (error) {
    console.error('Error processing checkout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Generate unique order number
async function generateOrderNumber() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)
  return `AM${timestamp}${random}`.toUpperCase()
}

// Calculate delivery fee for a specific vendor
async function calculateVendorDeliveryFee(vendor: any, customerLat?: number, customerLng?: number) {
  // Default delivery fee if no coordinates available
  if (!customerLat || !customerLng || !vendor.latitude || !vendor.longitude) {
    return vendor.deliveryFee || 5.99
  }

  // Calculate distance using Haversine formula
  const distance = calculateDistance(
    vendor.latitude,
    vendor.longitude,
    customerLat,
    customerLng
  )

  // Check delivery zones
  const deliveryZones = await prisma.deliveryZone.findMany({
    where: {
      vendorId: vendor.id,
      isActive: true
    },
    orderBy: {
      baseFee: 'asc'
    }
  })

  for (const zone of deliveryZones) {
    if (distance <= (zone.maxDistance || 50)) {
      let fee = zone.baseFee
      if (zone.feePerKm) {
        fee += distance * zone.feePerKm
      }
      return fee
    }
  }

  // Default calculation if no zones match
  const baseFee = vendor.deliveryFee || 5.99
  const distanceFee = distance * 0.50 // $0.50 per km
  return baseFee + distanceFee
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
