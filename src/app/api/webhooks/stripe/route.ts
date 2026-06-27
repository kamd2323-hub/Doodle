import { NextResponse } from 'next/server';
import { handleInvoicePaid } from '@/lib/dunning/processor';
import Stripe from 'stripe';

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'your-stripe-secret-key') {
    return null;
  }
  return new Stripe(key, { apiVersion: '2025-02-11' as any });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const sig = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    // Signature verification if webhook secret is configured
    if (webhookSecret && webhookSecret !== 'your-stripe-webhook-secret' && sig) {
      const stripe = getStripeClient();
      if (!stripe) {
        console.warn('[StripeWebhook] Stripe secret key not configured, skipping signature verification');
      } else {
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        } catch (err: any) {
          console.error(`[StripeWebhook] Signature verification failed: ${err.message}`);
          return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
        }
      }
    }

    if (!event) {
      // Direct parsing for development / mock runs where webhook signature verification is disabled/skipped
      try {
        event = JSON.parse(rawBody);
      } catch (e: any) {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }
    }

    console.log(`[StripeWebhook] Received event: ${event.type}`);

    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
      const invoiceObj = event.data.object as any;
      const stripeInvoiceId = invoiceObj.id; // in_...
      const transactionId = invoiceObj.charge || invoiceObj.payment_intent || null;
      const amountPaidCents = invoiceObj.amount_paid || invoiceObj.amount_due_cents || 0;

      console.log(`[StripeWebhook] Invoice ${stripeInvoiceId} paid. Stopping dunning campaigns...`);
      
      const result = await handleInvoicePaid(
        'stripe',
        stripeInvoiceId,
        transactionId,
        amountPaidCents
      );

      return NextResponse.json({
        received: true,
        type: event.type,
        processed: true,
        ...result
      });
    }

    return NextResponse.json({ received: true, type: event.type, processed: false });
  } catch (error: any) {
    console.error('[StripeWebhook] Critical unhandled error in webhook handler:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
