
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Calculate cart totals with tax and delivery fees
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      deliveryAddress, 
      deliveryLatitude, 
      deliveryLongitude, 
      isDelivery = true,
      promoCode 
    } = await req.json()

    // Get cart
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
                    deliveryFee: true,
                    minimumOrderAmount: true,
                    address: true,
                    city: true,
                    province: true,
                    postalCode: true,
                    latitude: true,
                    longitude: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum: number, item: any) => sum + item.subtotal, 0)

    // Calculate delivery fees
    let deliveryFee = 0
    if (isDelivery && deliveryLatitude && deliveryLongitude) {
      deliveryFee = await calculateDeliveryFees(
        cart.items, 
        deliveryLatitude, 
        deliveryLongitude
      )
    }

    // Calculate tax
    const taxCalculation = await calculateTax(subtotal, {
      province: 'Newfoundland and Labrador',
      city: 'St. John\'s',
      postalCode: 'A1C'
    })

    // Calculate discount
    let discountAmount = 0
    let appliedPromo = null
    if (promoCode) {
      const promoResult = await validateAndCalculatePromo(promoCode, subtotal, deliveryFee, session.user.id)
      if (promoResult.valid) {
        discountAmount = promoResult.discountAmount || 0
        appliedPromo = promoResult.promoCode
      }
    }

    const total = subtotal + taxCalculation.totalTax + deliveryFee - discountAmount

    // Group items by vendor for breakdown
    const vendorBreakdown = cart.items.reduce((acc: any, item: any) => {
      const vendorId = item.vendorId
      if (!acc[vendorId]) {
        acc[vendorId] = {
          vendor: item.product.vendor,
          items: [],
          subtotal: 0,
          deliveryFee: 0,
          tax: 0,
          total: 0
        }
      }
      acc[vendorId].items.push(item)
      acc[vendorId].subtotal += item.subtotal
      return acc
    }, {})

    // Calculate per-vendor delivery fees and taxes
    for (const vendorId in vendorBreakdown) {
      const vendorGroup = vendorBreakdown[vendorId]
      
      if (isDelivery && deliveryLatitude && deliveryLongitude) {
        vendorGroup.deliveryFee = await calculateVendorDeliveryFee(
          vendorGroup.vendor,
          deliveryLatitude,
          deliveryLongitude
        )
      }
      
      const vendorTax = await calculateTax(vendorGroup.subtotal, {
        province: 'Newfoundland and Labrador',
        city: 'St. John\'s',
        postalCode: 'A1C'
      })
      
      vendorGroup.tax = vendorTax.totalTax
      vendorGroup.total = vendorGroup.subtotal + vendorGroup.tax + vendorGroup.deliveryFee
    }

    const response = {
      subtotal,
      tax: taxCalculation.totalTax,
      taxBreakdown: {
        hst: taxCalculation.hst,
        gst: taxCalculation.gst,
        pst: taxCalculation.pst,
        rate: taxCalculation.taxRate
      },
      deliveryFee,
      discountAmount,
      appliedPromo,
      total,
      vendorBreakdown: Object.values(vendorBreakdown),
      calculation: {
        subtotal,
        tax: taxCalculation.totalTax,
        deliveryFee,
        discount: discountAmount,
        total
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error calculating cart:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Calculate delivery fees based on distance
async function calculateDeliveryFees(items: any[], customerLat: number, customerLng: number) {
  const vendorGroups = items.reduce((acc: any, item) => {
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

  let totalDeliveryFee = 0

  for (const vendorId in vendorGroups) {
    const vendorGroup = vendorGroups[vendorId]
    const fee = await calculateVendorDeliveryFee(
      vendorGroup.vendor,
      customerLat,
      customerLng
    )
    totalDeliveryFee += fee
  }

  return totalDeliveryFee
}

// Calculate delivery fee for a specific vendor
async function calculateVendorDeliveryFee(vendor: any, customerLat: number, customerLng: number) {
  // Default delivery fee if no coordinates available
  if (!vendor.latitude || !vendor.longitude) {
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

// Calculate tax based on location
async function calculateTax(subtotal: number, location: any) {
  // Newfoundland and Labrador tax rates
  const taxRate = 0.15 // 15% HST
  const hst = subtotal * taxRate
  
  return {
    hst,
    gst: 0,
    pst: 0,
    totalTax: hst,
    taxRate
  }
}

// Validate and calculate promo code discount
async function validateAndCalculatePromo(code: string, subtotal: number, deliveryFee: number, userId: string) {
  const promoCode = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      vendor: true
    }
  })

  if (!promoCode) {
    return { valid: false, error: 'Invalid promo code' }
  }

  const now = new Date()

  // Validate promo code
  if (!promoCode.isActive || 
      (promoCode.validUntil && promoCode.validUntil < now) ||
      promoCode.validFrom > now) {
    return { valid: false, error: 'Promo code is not valid' }
  }

  if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
    return { valid: false, error: 'Promo code usage limit reached' }
  }

  if (promoCode.minimumOrderAmount && subtotal < promoCode.minimumOrderAmount) {
    return { 
      valid: false, 
      error: `Minimum order amount of $${promoCode.minimumOrderAmount.toFixed(2)} required` 
    }
  }

  // Calculate discount
  let discountAmount = 0
  if (promoCode.type === 'PERCENTAGE') {
    discountAmount = (subtotal * promoCode.discountValue) / 100
    if (promoCode.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, promoCode.maxDiscountAmount)
    }
  } else if (promoCode.type === 'FIXED_AMOUNT') {
    discountAmount = promoCode.discountValue
  } else if (promoCode.type === 'FREE_DELIVERY') {
    discountAmount = deliveryFee
  }

  return { valid: true, discountAmount, promoCode }
}
