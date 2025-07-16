
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
    const { paymentId, amount, reason, customerNote } = body;

    if (!paymentId || !amount || !reason) {
      return NextResponse.json({ 
        error: 'Payment ID, amount, and reason are required' 
      }, { status: 400 });
    }

    // Validate refund amount
    if (!PaymentUtils.validatePaymentAmount(amount)) {
      return NextResponse.json({ 
        error: 'Invalid refund amount' 
      }, { status: 400 });
    }

    const refund = await paymentService.createRefund(
      paymentId,
      amount,
      reason,
      session.user.id
    );

    return NextResponse.json({ refund });
  } catch (error) {
    console.error('Create refund error:', error);
    return NextResponse.json({ 
      error: 'Failed to create refund' 
    }, { status: 500 });
  }
}
