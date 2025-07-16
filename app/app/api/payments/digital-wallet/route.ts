
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { WalletType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let wallet = await prisma.digitalWallet.findUnique({
      where: { userId: session.user.id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Create wallet if it doesn't exist
    if (!wallet) {
      wallet = await prisma.digitalWallet.create({
        data: {
          userId: session.user.id,
          type: WalletType.CUSTOMER,
          balance: 0,
          currency: 'CAD',
        },
        include: {
          transactions: true,
        },
      });
    }

    return NextResponse.json({ wallet });
  } catch (error) {
    console.error('Get digital wallet error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch digital wallet' 
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
    const { type, amount, description, reference } = body;

    if (!type || !amount || !description) {
      return NextResponse.json({ 
        error: 'Type, amount, and description are required' 
      }, { status: 400 });
    }

    const wallet = await prisma.digitalWallet.findUnique({
      where: { userId: session.user.id },
    });

    if (!wallet) {
      return NextResponse.json({ 
        error: 'Digital wallet not found' 
      }, { status: 404 });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = type === 'credit' 
      ? balanceBefore + amount 
      : balanceBefore - amount;

    if (balanceAfter < 0) {
      return NextResponse.json({ 
        error: 'Insufficient wallet balance' 
      }, { status: 400 });
    }

    // Update wallet balance and create transaction
    await prisma.$transaction(async (tx) => {
      await tx.digitalWallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount,
          balanceBefore,
          balanceAfter,
          description,
          reference,
        },
      });
    });

    return NextResponse.json({ 
      success: true,
      newBalance: balanceAfter 
    });
  } catch (error) {
    console.error('Digital wallet transaction error:', error);
    return NextResponse.json({ 
      error: 'Failed to process wallet transaction' 
    }, { status: 500 });
  }
}
