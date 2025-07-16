
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripeService } from '@/lib/stripe-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = params.id;

    const status = await stripeService.getAccountStatus(accountId);

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Get account status error:', error);
    return NextResponse.json({ 
      error: 'Failed to get account status' 
    }, { status: 500 });
  }
}
