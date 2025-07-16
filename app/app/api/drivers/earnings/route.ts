

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get driver earnings analytics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'week' // day, week, month, year
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    let dateRange: { start: Date; end: Date }

    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    } else {
      const now = new Date()
      switch (period) {
        case 'day':
          dateRange = {
            start: new Date(now.setHours(0, 0, 0, 0)),
            end: new Date(now.setHours(23, 59, 59, 999))
          }
          break
        case 'week':
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          dateRange = {
            start: weekStart,
            end: new Date()
          }
          break
        case 'month':
          dateRange = {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date()
          }
          break
        case 'year':
          dateRange = {
            start: new Date(now.getFullYear(), 0, 1),
            end: new Date()
          }
          break
        default:
          dateRange = {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
          }
      }
    }

    // Get earnings analytics for the period
    const analytics = await prisma.driverEarningsAnalytics.findMany({
      where: {
        driverId: driver.id,
        date: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      orderBy: { date: 'desc' }
    })

    // Calculate totals
    const totals = analytics.reduce((acc, day) => ({
      totalEarnings: acc.totalEarnings + day.totalEarnings,
      baseEarnings: acc.baseEarnings + day.baseEarnings,
      bonusEarnings: acc.bonusEarnings + day.bonusEarnings,
      tipEarnings: acc.tipEarnings + day.tipEarnings,
      fuelAllowance: acc.fuelAllowance + day.fuelAllowance,
      deductions: acc.deductions + day.deductions,
      netEarnings: acc.netEarnings + day.netEarnings,
      totalDeliveries: acc.totalDeliveries + day.totalDeliveries,
      totalRides: acc.totalRides + day.totalRides,
      totalDistance: acc.totalDistance + day.totalDistance,
      totalTime: acc.totalTime + day.totalTime,
      peakHourEarnings: acc.peakHourEarnings + day.peakHourEarnings,
      offPeakEarnings: acc.offPeakEarnings + day.offPeakEarnings
    }), {
      totalEarnings: 0,
      baseEarnings: 0,
      bonusEarnings: 0,
      tipEarnings: 0,
      fuelAllowance: 0,
      deductions: 0,
      netEarnings: 0,
      totalDeliveries: 0,
      totalRides: 0,
      totalDistance: 0,
      totalTime: 0,
      peakHourEarnings: 0,
      offPeakEarnings: 0
    })

    // Calculate averages
    const avgEarningsPerHour = totals.totalTime > 0 ? 
      (totals.totalEarnings / (totals.totalTime / 60)) : 0
    const avgEarningsPerDelivery = totals.totalDeliveries > 0 ? 
      (totals.totalEarnings / totals.totalDeliveries) : 0
    const avgEarningsPerKm = totals.totalDistance > 0 ? 
      (totals.totalEarnings / totals.totalDistance) : 0

    // Get recent earnings (last 7 days)
    const recentEarnings = await prisma.earning.findMany({
      where: {
        driverId: driver.id,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json({
      period,
      dateRange,
      analytics,
      totals: {
        ...totals,
        avgEarningsPerHour,
        avgEarningsPerDelivery,
        avgEarningsPerKm
      },
      recentEarnings
    })
  } catch (error) {
    console.error('Error fetching driver earnings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update daily earnings analytics
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date } = await req.json()

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

    // Get earnings for the day
    const earnings = await prisma.earning.findMany({
      where: {
        driverId: driver.id,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },

    })

    // Calculate analytics
    const analytics = earnings.reduce((acc, earning) => {
      const isDelivery = !!earning.orderId
      const isRide = !!earning.rideId
      
      return {
        totalEarnings: acc.totalEarnings + earning.amount,
        baseEarnings: acc.baseEarnings + earning.amount,
        bonusEarnings: acc.bonusEarnings + 0,
        tipEarnings: acc.tipEarnings + 0,
        fuelAllowance: acc.fuelAllowance + 0,
        deductions: acc.deductions + earning.commission,
        netEarnings: acc.netEarnings + earning.netAmount,
        totalDeliveries: acc.totalDeliveries + (isDelivery ? 1 : 0),
        totalRides: acc.totalRides + (isRide ? 1 : 0),
        totalDistance: acc.totalDistance + 0,
        totalTime: acc.totalTime + 0
      }
    }, {
      totalEarnings: 0,
      baseEarnings: 0,
      bonusEarnings: 0,
      tipEarnings: 0,
      fuelAllowance: 0,
      deductions: 0,
      netEarnings: 0,
      totalDeliveries: 0,
      totalRides: 0,
      totalDistance: 0,
      totalTime: 0
    })

    // Calculate additional metrics
    const avgEarningsPerHour = analytics.totalTime > 0 ? 
      (analytics.totalEarnings / (analytics.totalTime / 60)) : 0
    const avgEarningsPerKm = analytics.totalDistance > 0 ? 
      (analytics.totalEarnings / analytics.totalDistance) : 0

    // Get shift info for the day
    const shift = await prisma.driverShift.findFirst({
      where: {
        driverId: driver.id,
        startTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })

    // Update or create analytics record
    const analyticsRecord = await prisma.driverEarningsAnalytics.upsert({
      where: {
        driverId_date: {
          driverId: driver.id,
          date: startOfDay
        }
      },
      update: {
        ...analytics,
        avgEarningsPerHour,
        avgEarningsPerKm,
        shiftId: shift?.id || null
      },
      create: {
        driverId: driver.id,
        date: startOfDay,
        shiftId: shift?.id || null,
        ...analytics,
        avgEarningsPerHour,
        avgEarningsPerKm
      }
    })

    return NextResponse.json({
      message: 'Earnings analytics updated',
      analytics: analyticsRecord
    })
  } catch (error) {
    console.error('Error updating earnings analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
