
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { paymentService } from '@/lib/payment-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Start date and end date are required' 
      }, { status: 400 });
    }

    const analytics = await paymentService.getPaymentAnalytics(
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Get payment analytics error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch payment analytics' 
    }, { status: 500 });
  }
}
