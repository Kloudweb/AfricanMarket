
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SafetyService } from '@/lib/safety-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const shareTrip = z.object({
  rideId: z.string(),
  contacts: z.array(z.object({
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email().optional(),
  })).min(1, 'At least one contact is required'),
  shareLocation: z.boolean().optional(),
  shareETA: z.boolean().optional(),
  shareDriver: z.boolean().optional(),
  shareRoute: z.boolean().optional(),
  expiresAt: z.string().optional(),
})

// Share trip with contacts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = shareTrip.parse(body)

    const tripShares = await SafetyService.shareTripWithContacts({
      ...validatedData,
      sharedBy: session.user.id,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
    })

    return NextResponse.json({
      success: true,
      data: tripShares
    })

  } catch (error) {
    console.error('Error sharing trip:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to share trip' },
      { status: 500 }
    )
  }
}
