
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { paymentService } from '@/lib/payment-service';
import { PaymentUtils } from '@/lib/payment-utils';
import { PaymentMethodType, PaymentProvider } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paymentMethods = await paymentService.getPaymentMethods(session.user.id);

    return NextResponse.json({ paymentMethods });
  } catch (error) {
    console.error('Get payment methods error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch payment methods' 
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
    const { 
      type, 
      provider, 
      stripePaymentMethodId, 
      squareCardId, 
      isDefault = false, 
      nickname, 
      billingAddress 
    } = body;

    // Validate payment method type and provider combination
    if (!PaymentUtils.validatePaymentMethod(type as PaymentMethodType, provider as PaymentProvider)) {
      return NextResponse.json({ 
        error: 'Invalid payment method type and provider combination' 
      }, { status: 400 });
    }

    const paymentMethod = await paymentService.addPaymentMethod({
      userId: session.user.id,
      type: type as PaymentMethodType,
      provider: provider as PaymentProvider,
      stripePaymentMethodId,
      squareCardId,
      isDefault,
      nickname,
      billingAddress,
    });

    return NextResponse.json({ paymentMethod });
  } catch (error) {
    console.error('Add payment method error:', error);
    return NextResponse.json({ 
      error: 'Failed to add payment method' 
    }, { status: 500 });
  }
}
