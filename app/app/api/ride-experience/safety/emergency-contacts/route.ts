
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SafetyService } from '@/lib/safety-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createEmergencyContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email().optional(),
  relationship: z.string().optional(),
  priority: z.number().min(1).max(10).optional(),
  isPrimary: z.boolean().optional(),
  notifyTrips: z.boolean().optional(),
  notifyEmergency: z.boolean().optional(),
  notifyLate: z.boolean().optional(),
})

// Create emergency contact
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createEmergencyContactSchema.parse(body)

    const contact = await SafetyService.createEmergencyContact({
      ...validatedData,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: contact
    })

  } catch (error) {
    console.error('Error creating emergency contact:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create emergency contact' },
      { status: 500 }
    )
  }
}

// Get emergency contacts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contacts = await SafetyService.getEmergencyContacts(session.user.id)

    return NextResponse.json({
      success: true,
      data: contacts
    })

  } catch (error) {
    console.error('Error getting emergency contacts:', error)
    return NextResponse.json(
      { error: 'Failed to get emergency contacts' },
      { status: 500 }
    )
  }
}
