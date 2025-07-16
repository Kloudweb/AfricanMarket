
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Validate promo code
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, subtotal, vendorIds } = await req.json()

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })
    }

    // Get promo code
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true
          }
        }
      }
    })

    if (!promoCode) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid promo code' 
      }, { status: 400 })
    }

    const now = new Date()

    // Check if promo code is active
    if (!promoCode.isActive) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Promo code is not active' 
      }, { status: 400 })
    }

    // Check validity period
    if (promoCode.validUntil && promoCode.validUntil < now) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Promo code has expired' 
      }, { status: 400 })
    }

    if (promoCode.validFrom > now) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Promo code is not yet valid' 
      }, { status: 400 })
    }

    // Check usage limits
    if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Promo code usage limit reached' 
      }, { status: 400 })
    }

    // Check per-user limits
    if (promoCode.userLimit) {
      const userUsageCount = await prisma.promoCodeUsage.count({
        where: {
          userId: session.user.id,
          promoCodeId: promoCode.id
        }
      })

      if (userUsageCount >= promoCode.userLimit) {
        return NextResponse.json({ 
          valid: false, 
          error: 'You have reached the usage limit for this promo code' 
        }, { status: 400 })
      }
    }

    // Check minimum order amount
    if (promoCode.minimumOrderAmount && subtotal < promoCode.minimumOrderAmount) {
      return NextResponse.json({ 
        valid: false, 
        error: `Minimum order amount of $${promoCode.minimumOrderAmount.toFixed(2)} required` 
      }, { status: 400 })
    }

    // Check vendor-specific codes
    if (promoCode.vendorId && vendorIds) {
      const hasVendorItems = vendorIds.includes(promoCode.vendorId)
      if (!hasVendorItems) {
        return NextResponse.json({ 
          valid: false, 
          error: `This promo code is only valid for ${promoCode.vendor?.businessName}` 
        }, { status: 400 })
      }
    }

    // Calculate discount amount
    let discountAmount = 0
    if (promoCode.type === 'PERCENTAGE') {
      discountAmount = (subtotal * promoCode.discountValue) / 100
      if (promoCode.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, promoCode.maxDiscountAmount)
      }
    } else if (promoCode.type === 'FIXED_AMOUNT') {
      discountAmount = promoCode.discountValue
    }

    return NextResponse.json({
      valid: true,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        type: promoCode.type,
        discountValue: promoCode.discountValue,
        description: promoCode.description,
        vendor: promoCode.vendor
      },
      discountAmount,
      savings: discountAmount
    })
  } catch (error) {
    console.error('Error validating promo code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
