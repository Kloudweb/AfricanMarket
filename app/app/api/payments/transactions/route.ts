
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { paymentService } from '@/lib/payment-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await paymentService.getTransactionHistory(
      session.user.id,
      page,
      limit
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get transaction history error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch transaction history' 
    }, { status: 500 });
  }
}
