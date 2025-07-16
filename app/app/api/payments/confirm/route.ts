
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { paymentService } from '@/lib/payment-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, paymentMethodId } = body;

    if (!paymentId) {
      return NextResponse.json({ 
        error: 'Payment ID is required' 
      }, { status: 400 });
    }

    // Confirm payment
    const result = await paymentService.confirmPayment(paymentId, paymentMethodId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json({ 
      error: 'Failed to confirm payment' 
    }, { status: 500 });
  }
}
