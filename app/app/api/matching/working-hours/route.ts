
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get driver working hours
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      include: {
        workingHoursConfig: {
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      workingHours: driver.workingHoursConfig
    })
  } catch (error) {
    console.error('Error getting working hours:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update driver working hours
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { workingHours } = body

    if (!workingHours || !Array.isArray(workingHours)) {
      return NextResponse.json({ error: 'Working hours array is required' }, { status: 400 })
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Delete existing working hours
    await prisma.driverWorkingHours.deleteMany({
      where: { driverId: driver.id }
    })

    // Create new working hours
    const createdHours = await Promise.all(
      workingHours.map(async (hour: any) => {
        return await prisma.driverWorkingHours.create({
          data: {
            driverId: driver.id,
            dayOfWeek: hour.dayOfWeek,
            startTime: hour.startTime,
            endTime: hour.endTime,
            isActive: hour.isActive ?? true,
            timezone: hour.timezone || 'America/St_Johns',
            breakStart: hour.breakStart,
            breakEnd: hour.breakEnd,
            isHoliday: hour.isHoliday ?? false,
            holidayName: hour.holidayName
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      workingHours: createdHours,
      message: 'Working hours updated successfully'
    })
  } catch (error) {
    console.error('Error updating working hours:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
