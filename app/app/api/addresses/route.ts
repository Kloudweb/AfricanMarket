
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get user's saved addresses
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addresses = await prisma.savedAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(addresses)
  } catch (error) {
    console.error('Error fetching addresses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add new address
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      label,
      firstName,
      lastName,
      company,
      address,
      apartment,
      city,
      province,
      postalCode,
      phone,
      isDefault,
      deliveryInstructions
    } = await req.json()

    // Validate required fields
    if (!label || !address || !city || !province || !postalCode) {
      return NextResponse.json({ 
        error: 'Label, address, city, province, and postal code are required' 
      }, { status: 400 })
    }

    // If this is being set as default, remove default from other addresses
    if (isDefault) {
      await prisma.savedAddress.updateMany({
        where: { 
          userId: session.user.id,
          isDefault: true 
        },
        data: { isDefault: false }
      })
    }

    // Create new address
    const newAddress = await prisma.savedAddress.create({
      data: {
        userId: session.user.id,
        label,
        firstName,
        lastName,
        company,
        address,
        apartment,
        city,
        province,
        postalCode,
        country: 'Canada',
        phone,
        isDefault: isDefault || false,
        deliveryInstructions
      }
    })

    return NextResponse.json(newAddress, { status: 201 })
  } catch (error) {
    console.error('Error creating address:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
