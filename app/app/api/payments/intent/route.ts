
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
    const { 
      amount, 
      currency = 'CAD', 
      orderId, 
      rideId, 
      paymentMethodId, 
      description,
      metadata 
    } = body;

    // Validate payment amount
    if (!PaymentUtils.validatePaymentAmount(amount)) {
      return NextResponse.json({ 
        error: 'Invalid payment amount' 
      }, { status: 400 });
    }

    // Create payment intent
    const result = await paymentService.createPaymentIntent({
      amount,
      currency,
      orderId,
      rideId,
      customerId: session.user.id,
      paymentMethodId,
      description,
      metadata,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create payment intent' 
    }, { status: 500 });
  }
}
