
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let loyaltyPoints = await prisma.loyaltyPoints.findUnique({
      where: { userId: session.user.id },
      include: {
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Create loyalty points if they don't exist
    if (!loyaltyPoints) {
      loyaltyPoints = await prisma.loyaltyPoints.create({
        data: {
          userId: session.user.id,
          points: 0,
          tier: 'bronze',
        },
        include: {
          history: true,
        },
      });
    }

    return NextResponse.json({ loyaltyPoints });
  } catch (error) {
    console.error('Get loyalty points error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch loyalty points' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, points, description, orderId, rideId } = body;

    if (!type || !points || !description) {
      return NextResponse.json({ 
        error: 'Type, points, and description are required' 
      }, { status: 400 });
    }

    const loyaltyPoints = await prisma.loyaltyPoints.findUnique({
      where: { userId: session.user.id },
    });

    if (!loyaltyPoints) {
      return NextResponse.json({ 
        error: 'Loyalty points not found' 
      }, { status: 404 });
    }

    const balanceBefore = loyaltyPoints.points;
    const balanceAfter = type === 'earned' 
      ? balanceBefore + points 
      : balanceBefore - points;

    if (balanceAfter < 0) {
      return NextResponse.json({ 
        error: 'Insufficient loyalty points' 
      }, { status: 400 });
    }

    // Update loyalty points and create history
    await prisma.$transaction(async (tx) => {
      await tx.loyaltyPoints.update({
        where: { id: loyaltyPoints.id },
        data: { 
          points: balanceAfter,
          lifetimeEarned: type === 'earned' 
            ? loyaltyPoints.lifetimeEarned + points 
            : loyaltyPoints.lifetimeEarned,
          lifetimeSpent: type === 'spent' 
            ? loyaltyPoints.lifetimeSpent + points 
            : loyaltyPoints.lifetimeSpent,
        },
      });

      await tx.loyaltyPointsHistory.create({
        data: {
          loyaltyPointsId: loyaltyPoints.id,
          type,
          points: type === 'earned' ? points : -points,
          balanceBefore,
          balanceAfter,
          description,
          orderId,
          rideId,
        },
      });
    });

    return NextResponse.json({ 
      success: true,
      newBalance: balanceAfter 
    });
  } catch (error) {
    console.error('Loyalty points transaction error:', error);
    return NextResponse.json({ 
      error: 'Failed to process loyalty points transaction' 
    }, { status: 500 });
  }
}
