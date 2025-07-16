
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripeService } from '@/lib/stripe-service';

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

    const body = await request.json();
    const { returnUrl, refreshUrl } = body;
    const accountId = params.id;

    if (!returnUrl || !refreshUrl) {
      return NextResponse.json({ 
        error: 'Return URL and refresh URL are required' 
      }, { status: 400 });
    }

    const accountLink = await stripeService.createAccountLink(
      accountId,
      returnUrl,
      refreshUrl
    );

    return NextResponse.json({ accountLink });
  } catch (error) {
    console.error('Create account link error:', error);
    return NextResponse.json({ 
      error: 'Failed to create account link' 
    }, { status: 500 });
  }
}
