
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Update preparation time estimate
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendorId = params.id
    const { orderId, estimatedTime, complexity, rush } = await req.json()

    // Check if user owns this vendor
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    })

    if (!vendor || vendor.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create preparation time entry
    const preparationTime = await prisma.preparationTime.create({
      data: {
        vendorId,
        orderId,
        baseTime: estimatedTime,
        complexity: complexity || 1,
        rush: rush || false,
        estimatedTime
      }
    })

    // Update order estimated delivery time
    if (orderId) {
      const estimatedDelivery = new Date(Date.now() + estimatedTime * 60000)
      
      await prisma.order.update({
        where: { id: orderId },
        data: {
          estimatedDelivery
        }
      })

      // Update time estimate
      await prisma.orderTimeEstimate.upsert({
        where: { orderId },
        update: {
          preparationTime: estimatedTime,
          estimatedPickup: new Date(Date.now() + estimatedTime * 60000)
        },
        create: {
          orderId,
          preparationTime: estimatedTime,
          pickupTime: 10,
          deliveryTime: 20,
          totalTime: estimatedTime + 30,
          estimatedPickup: new Date(Date.now() + estimatedTime * 60000)
        }
      })

      // Add tracking entry
      await prisma.orderTracking.create({
        data: {
          orderId,
          status: 'CONFIRMED',
          message: `Order confirmed. Estimated preparation time: ${estimatedTime} minutes`,
          updatedBy: session.user.id,
          estimatedTime: estimatedDelivery
        }
      })
    }

    return NextResponse.json({
      message: 'Preparation time updated successfully',
      preparationTime
    })
  } catch (error) {
    console.error('Error updating preparation time:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get vendor preparation time statistics
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendorId = params.id

    // Check if user owns this vendor
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    })

    if (!vendor || vendor.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get preparation time statistics
    const preparationTimes = await prisma.preparationTime.findMany({
      where: {
        vendorId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate statistics
    const totalOrders = preparationTimes.length
    const avgEstimatedTime = totalOrders > 0 ? 
      preparationTimes.reduce((sum, pt) => sum + pt.estimatedTime, 0) / totalOrders : 0
    
    const avgActualTime = preparationTimes
      .filter(pt => pt.actualTime)
      .reduce((sum, pt, _, arr) => sum + (pt.actualTime || 0) / arr.length, 0)

    const accuracy = avgActualTime > 0 ? 
      Math.max(0, 100 - Math.abs(avgEstimatedTime - avgActualTime) / avgEstimatedTime * 100) : 0

    return NextResponse.json({
      statistics: {
        totalOrders,
        avgEstimatedTime: Math.round(avgEstimatedTime),
        avgActualTime: Math.round(avgActualTime),
        accuracy: Math.round(accuracy),
        recentPreparationTimes: preparationTimes.slice(0, 10)
      }
    })
  } catch (error) {
    console.error('Error fetching preparation time statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
