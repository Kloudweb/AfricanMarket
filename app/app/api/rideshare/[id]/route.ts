
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateRideSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  cancelReason: z.string().optional(),
  notes: z.string().optional(),
})

interface Props {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ride = await prisma.ride.findFirst({
      where: {
        id: params.id,
        OR: [
          { customerId: session.user.id },
          { 
            driver: { userId: session.user.id } 
          }
        ]
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          }
        },
        driver: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                avatar: true,
              }
            },
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleColor: true,
            vehiclePlate: true,
            rating: true,
            totalRides: true,
            currentLatitude: true,
            currentLongitude: true,
          }
        },
        fareEstimate: true,
        rideRequest: true,
        tracking: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 20
        },
        payment: true,
        review: true,
      }
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: ride
    })

  } catch (error) {
    console.error('Error fetching ride:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ride' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateRideSchema.parse(body)

    // Check if user can update this ride
    const ride = await prisma.ride.findFirst({
      where: {
        id: params.id,
        OR: [
          { customerId: session.user.id },
          { 
            driver: { userId: session.user.id } 
          }
        ]
      },
      include: {
        customer: true,
        driver: {
          include: {
            user: true
          }
        }
      }
    })

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
    }

    // Update data
    const updateData: any = {}
    
    if (validatedData.status) {
      updateData.status = validatedData.status
      
      // Set timestamps based on status
      if (validatedData.status === 'ACCEPTED') {
        updateData.acceptedAt = new Date()
      } else if (validatedData.status === 'DRIVER_ARRIVING') {
        updateData.arrivedAt = new Date()
      } else if (validatedData.status === 'IN_PROGRESS') {
        updateData.startedAt = new Date()
      } else if (validatedData.status === 'COMPLETED') {
        updateData.completedAt = new Date()
      } else if (validatedData.status === 'CANCELLED') {
        updateData.cancelledAt = new Date()
        updateData.cancelReason = validatedData.cancelReason
        updateData.cancelledBy = session.user.id === ride.customerId ? 'USER' : 'DRIVER'
      }
    }

    if (validatedData.notes) {
      updateData.notes = validatedData.notes
    }

    const updatedRide = await prisma.ride.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          }
        },
        driver: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                avatar: true,
              }
            },
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleColor: true,
            vehiclePlate: true,
            rating: true,
            totalRides: true,
            currentLatitude: true,
            currentLongitude: true,
          }
        },
        fareEstimate: true,
        tracking: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 20
        }
      }
    })

    // Create tracking entry
    if (validatedData.status) {
      await prisma.rideTracking.create({
        data: {
          rideId: params.id,
          status: validatedData.status,
          message: getStatusMessage(validatedData.status),
          timestamp: new Date(),
        }
      })
    }

    // TODO: Send real-time notifications
    // This would be handled by a WebSocket service

    return NextResponse.json({
      success: true,
      data: updatedRide
    })

  } catch (error) {
    console.error('Error updating ride:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update ride' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ride = await prisma.ride.findFirst({
      where: {
        id: params.id,
        customerId: session.user.id,
        status: {
          in: ['PENDING', 'ACCEPTED']
        }
      }
    })

    if (!ride) {
      return NextResponse.json({ 
        error: 'Ride not found or cannot be cancelled' 
      }, { status: 404 })
    }

    // Cancel the ride
    const cancelledRide = await prisma.ride.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: 'Cancelled by customer',
        cancelledBy: 'USER'
      }
    })

    // Create tracking entry
    await prisma.rideTracking.create({
      data: {
        rideId: params.id,
        status: 'CANCELLED',
        message: 'Ride cancelled by customer',
        timestamp: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      data: cancelledRide
    })

  } catch (error) {
    console.error('Error cancelling ride:', error)
    return NextResponse.json(
      { error: 'Failed to cancel ride' },
      { status: 500 }
    )
  }
}

function getStatusMessage(status: string): string {
  const messages = {
    'PENDING': 'Ride request created',
    'ACCEPTED': 'Driver assigned and en route',
    'DRIVER_ARRIVING': 'Driver is arriving at pickup location',
    'IN_PROGRESS': 'Ride in progress',
    'COMPLETED': 'Ride completed successfully',
    'CANCELLED': 'Ride cancelled'
  }
  return messages[status as keyof typeof messages] || 'Status updated'
}
