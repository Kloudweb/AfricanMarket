
import { NextRequest, NextResponse } from 'next/server';
import { stripeService } from '@/lib/stripe-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const result = await stripeService.handleWebhook(body, signature);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed' 
    }, { status: 500 });
  }
}
