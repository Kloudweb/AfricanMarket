
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { paymentService } from '@/lib/payment-service';
import { PaymentUtils } from '@/lib/payment-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, currency = 'CAD', description, metadata } = body;

    // Validate payout amount
    if (!PaymentUtils.validatePaymentAmount(amount)) {
      return NextResponse.json({ 
        error: 'Invalid payout amount' 
      }, { status: 400 });
    }

    const payout = await paymentService.createPayout({
      userId: session.user.id,
      amount,
      currency,
      description,
      metadata,
    });

    return NextResponse.json({ payout });
  } catch (error) {
    console.error('Create payout error:', error);
    return NextResponse.json({ 
      error: 'Failed to create payout' 
    }, { status: 500 });
  }
}
