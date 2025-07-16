
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Update address
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addressId = params.id
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

    // Check if address belongs to user
    const existingAddress = await prisma.savedAddress.findUnique({
      where: { id: addressId }
    })

    if (!existingAddress || existingAddress.userId !== session.user.id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // If this is being set as default, remove default from other addresses
    if (isDefault) {
      await prisma.savedAddress.updateMany({
        where: { 
          userId: session.user.id,
          isDefault: true,
          id: { not: addressId }
        },
        data: { isDefault: false }
      })
    }

    // Update address
    const updatedAddress = await prisma.savedAddress.update({
      where: { id: addressId },
      data: {
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
        isDefault: isDefault || false,
        deliveryInstructions
      }
    })

    return NextResponse.json(updatedAddress)
  } catch (error) {
    console.error('Error updating address:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete address
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addressId = params.id

    // Check if address belongs to user
    const existingAddress = await prisma.savedAddress.findUnique({
      where: { id: addressId }
    })

    if (!existingAddress || existingAddress.userId !== session.user.id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // Delete address
    await prisma.savedAddress.delete({
      where: { id: addressId }
    })

    return NextResponse.json({ message: 'Address deleted successfully' })
  } catch (error) {
    console.error('Error deleting address:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
