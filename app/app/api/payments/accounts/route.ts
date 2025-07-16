
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripeService } from '@/lib/stripe-service';
import { PaymentProvider } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      type, 
      country = 'CA', 
      email, 
      businessType, 
      individual, 
      company 
    } = body;

    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 });
    }

    const account = await stripeService.createConnectedAccount({
      userId: session.user.id,
      type,
      country,
      email,
      businessType,
      individual,
      company,
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Create connected account error:', error);
    return NextResponse.json({ 
      error: 'Failed to create connected account' 
    }, { status: 500 });
  }
}
