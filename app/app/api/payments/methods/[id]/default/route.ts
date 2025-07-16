
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { paymentService } from '@/lib/payment-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paymentMethodId = params.id;

    await paymentService.setDefaultPaymentMethod(session.user.id, paymentMethodId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set default payment method error:', error);
    return NextResponse.json({ 
      error: 'Failed to set default payment method' 
    }, { status: 500 });
  }
}
