import { NextResponse } from 'next/server';
import { handleInvoicePaid } from '@/lib/dunning/processor';
import {
  getStripeClient,
  updateOrgSubscription,
  getPlanTierFromPrice,
  parseSubscriptionStatus,
} from '@/lib/billing';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'your-stripe-secret-key') {
    return null;
  }
  return new Stripe(key);
}

/**
 * Handle a subscription lifecycle event from Stripe.
 * Updates the organization's plan_tier, subscription_status, and related fields.
 */
async function handleSubscriptionEvent(event: any): Promise<{ success: boolean; message: string }> {
  const subscription = event.data.object as any;
  const subscriptionId = subscription.id;
  const customerId = subscription.customer;
  const status = parseSubscriptionStatus(subscription.status);
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  // Determine plan tier from the subscription items
  let planTier: 'standard' | 'premium' | 'none' = 'none';
  if (subscription.items?.data) {
    for (const item of subscription.items.data) {
      const priceId = item.price?.id;
      const tier = getPlanTierFromPrice(priceId);
      if (tier === 'premium') {
        planTier = 'premium';
        break;
      }
      if (tier === 'standard' && planTier === 'none') {
        planTier = 'standard';
      }
    }
  }

  // If subscription is canceled/unpaid, revoke access
  if (['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status)) {
    planTier = 'none';
  }

  // Get the organization_id from metadata (set during checkout creation)
  const orgId = subscription.metadata?.organization_id ||
    subscription.subscription?.metadata?.organization_id;

  if (orgId) {
    await updateOrgSubscription(orgId, {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_tier: planTier,
      subscription_status: status,
      current_period_end: currentPeriodEnd,
    });
    return { success: true, message: `Subscription ${subscriptionId} synced for org ${orgId} (tier: ${planTier}, status: ${status})` };
  }

  // If no orgId in metadata, try to find by customer ID
  const supabase = await (await import('@/lib/supabase-server')).createClient();
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co';

  if (!isMock) {
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
      if (org) {
        await updateOrgSubscription(org.id, {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan_tier: planTier,
          subscription_status: status,
          current_period_end: currentPeriodEnd,
        });
        return { success: true, message: `Subscription ${subscriptionId} synced for org ${org.id} (found by customer)` };
      }
    } catch { /* fall through */ }
  }

  // Also check mock store
  const fs = require('fs');
  const storePath = '/tmp/mock_subscriptions.json';
  try {
    if (fs.existsSync(storePath)) {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      for (const [oid, sub] of Object.entries(store.subscriptions || {})) {
        const record = sub as any;
        if (record.stripe_customer_id === customerId || record.stripe_subscription_id === subscriptionId) {
          await updateOrgSubscription(oid, {
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan_tier: planTier,
            subscription_status: status,
            current_period_end: currentPeriodEnd,
          });
          return { success: true, message: `Subscription ${subscriptionId} synced for org ${oid} (found in mock store)` };
        }
      }
    }
  } catch { /* ignore */ }

  return { success: true, message: `Subscription ${subscriptionId} received but no matching org found (customer: ${customerId}). Metadata needed for direct linking.` };
}

/**
 * Handle checkout.session.completed — create/persist subscription from checkout.
 */
async function handleCheckoutCompleted(event: any): Promise<{ success: boolean; message: string }> {
  const session = event.data.object as any;
  const orgId = session.metadata?.organization_id || session.client_reference_id;

  if (session.mode === 'subscription' && session.subscription) {
    // Fetch the full subscription to get details
    const stripe = getStripe();
    if (stripe) {
      try {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const mockEvent = { data: { object: subscription } };
        return await handleSubscriptionEvent(mockEvent);
      } catch (err: any) {
        console.error('[StripeWebhook] Failed to retrieve subscription after checkout:', err);
      }
    }

    // Mock fallback: determine plan from the line items
    let planTier: 'standard' | 'premium' | 'none' = 'none';
    if (session.line_items?.data) {
      for (const item of session.line_items.data) {
        const priceId = item.price?.id;
        const tier = getPlanTierFromPrice(priceId);
        if (tier === 'premium') planTier = 'premium';
        else if (tier === 'standard' && planTier === 'none') planTier = 'standard';
      }
    }
    // Also check display_items for legacy API
    if (planTier === 'none' && session.display_items) {
      for (const item of session.display_items) {
        const priceId = item.price?.id;
        const tier = getPlanTierFromPrice(priceId);
        if (tier === 'premium') planTier = 'premium';
        else if (tier === 'standard' && planTier === 'none') planTier = 'standard';
      }
    }

    if (orgId) {
      await updateOrgSubscription(orgId, {
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        plan_tier: planTier,
        subscription_status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      return { success: true, message: `Checkout completed for org ${orgId} (tier: ${planTier})` };
    }
  }

  return { success: true, message: 'Checkout completed - not a subscription mode' };
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const sig = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: any;

    // Signature verification if webhook secret is configured
    if (webhookSecret && webhookSecret !== 'your-stripe-webhook-secret' && sig) {
      const stripe = getStripe();
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
      // Direct parsing for development / mock runs
      try {
        event = JSON.parse(rawBody);
      } catch (e: any) {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }
    }

    console.log(`[StripeWebhook] Received event: ${event.type}`);

    // ─── Invoice / Payment Events ───────────────────────────────────────
    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
      const invoiceObj = event.data.object as any;
      const stripeInvoiceId = invoiceObj.id;
      const transactionId = invoiceObj.charge || invoiceObj.payment_intent || null;
      const amountPaidCents = invoiceObj.amount_paid || 0;

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

    // ─── Subscription Lifecycle Events ──────────────────────────────────
    if (event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.resumed') {
      const result = await handleSubscriptionEvent(event);
      return NextResponse.json({
        received: true,
        type: event.type,
        processed: true,
        subscription: result,
      });
    }

    if (event.type === 'customer.subscription.deleted' ||
        event.type === 'customer.subscription.paused') {
      // Mark as canceled
      const sub = event.data.object as any;
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : 'past_due';
      const mockEvent = { data: { object: { ...sub, status } } };
      const result = await handleSubscriptionEvent(mockEvent);
      return NextResponse.json({
        received: true,
        type: event.type,
        processed: true,
        subscription: result,
      });
    }

    // ─── Checkout Events ───────────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const result = await handleCheckoutCompleted(event);
      return NextResponse.json({
        received: true,
        type: event.type,
        processed: true,
        checkout: result,
      });
    }

    // ─── Invoice Payment Failed ─────────────────────────────────────────
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as any;
      const customerId = invoice.customer;
      // If payment fails, mark subscription as past_due
      if (invoice.subscription) {
        const mockEvent = {
          data: {
            object: {
              id: invoice.subscription,
              customer: customerId,
              status: 'past_due',
              current_period_end: invoice.current_period_end,
              items: { data: [] },
              metadata: {},
            },
          },
        };
        const result = await handleSubscriptionEvent(mockEvent);
        return NextResponse.json({
          received: true,
          type: event.type,
          processed: true,
          subscription: result,
        });
      }
    }

    return NextResponse.json({ received: true, type: event.type, processed: false });
  } catch (error: any) {
    console.error('[StripeWebhook] Critical unhandled error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';