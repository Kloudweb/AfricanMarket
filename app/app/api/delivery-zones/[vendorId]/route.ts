
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get delivery zones for a vendor
export async function GET(req: NextRequest, { params }: { params: { vendorId: string } }) {
  try {
    const vendorId = params.vendorId

    const deliveryZones = await prisma.deliveryZone.findMany({
      where: {
        vendorId: vendorId,
        isActive: true
      },
      orderBy: {
        baseFee: 'asc'
      }
    })

    return NextResponse.json(deliveryZones)
  } catch (error) {
    console.error('Error fetching delivery zones:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
