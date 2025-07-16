
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const driverPreferencesSchema = z.object({
  maxDistance: z.number().min(1).max(50).optional(),
  rideTypes: z.array(z.enum(['STANDARD', 'PREMIUM', 'SHARED'])).optional(),
  workingHours: z.record(z.object({
    start: z.string(),
    end: z.string(),
    isWorking: z.boolean()
  })).optional(),
  breakTimes: z.array(z.object({
    start: z.string(),
    end: z.string(),
    description: z.string().optional()
  })).optional(),
  workingDays: z.array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])).optional(),
  minRating: z.number().min(1).max(5).optional(),
  allowPets: z.boolean().optional(),
  allowSmoking: z.boolean().optional(),
  allowFood: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional(),
  autoAcceptEnabled: z.boolean().optional(),
  autoAcceptDistance: z.number().min(1).max(20).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a driver
    const driver = await prisma.driver.findFirst({
      where: { userId: session.user.id },
      include: {
        driverPreferences: true
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: driver.driverPreferences || {
        maxDistance: 10,
        rideTypes: ['STANDARD'],
        workingHours: {},
        breakTimes: [],
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        minRating: 3.0,
        allowPets: false,
        allowSmoking: false,
        allowFood: true,
        soundEnabled: true,
        vibrationEnabled: true,
        autoAcceptEnabled: false,
        autoAcceptDistance: 5,
      }
    })

  } catch (error) {
    console.error('Error fetching driver preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch driver preferences' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = driverPreferencesSchema.parse(body)

    // Check if user is a driver
    const driver = await prisma.driver.findFirst({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    // Check if preferences already exist
    const existingPreferences = await prisma.driverPreference.findFirst({
      where: { driverId: driver.id }
    })

    if (existingPreferences) {
      // Update existing preferences
      const updatedPreferences = await prisma.driverPreference.update({
        where: { driverId: driver.id },
        data: validatedData
      })

      return NextResponse.json({
        success: true,
        data: updatedPreferences
      })
    } else {
      // Create new preferences
      const newPreferences = await prisma.driverPreference.create({
        data: {
          driverId: driver.id,
          ...validatedData
        }
      })

      return NextResponse.json({
        success: true,
        data: newPreferences
      })
    }

  } catch (error) {
    console.error('Error saving driver preferences:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to save driver preferences' },
      { status: 500 }
    )
  }
}
