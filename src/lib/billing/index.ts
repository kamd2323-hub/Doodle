/**
 * Billing / Subscription management library for Reclaim AI.
 * Handles Stripe subscription lifecycle, plan tier syncing, and feature access.
 * Uses dual-persistence: Supabase first, then local mock store.
 */
import { createClient } from '@/lib/supabase-server'
import Stripe from 'stripe'
import * as fs from 'fs'

const MOCK_STORE_PATH = '/tmp/mock_subscriptions.json'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'canceled' | 'unpaid' | 'trialing'

export interface SubscriptionRecord {
  organization_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_tier: 'standard' | 'premium' | 'none'
  subscription_status: SubscriptionStatus | 'none'
  current_period_end: string | null
  updated_at: string
}

export interface FeatureCheck {
  allowed: boolean
  reason?: string
  plan: string
}

// Price IDs from Business Plan
export const PRICE_IDS = {
  STANDARD_MONTHLY: 'price_1TsjLKDExcDNxwkFkbIxelhO',
  PREMIUM_MONTHLY: 'price_1TsjLSDExcDNxwkFxxyF3xTa',
} as const

// ─── Mock Store ──────────────────────────────────────────────────────────────

interface MockStore {
  subscriptions: Record<string, SubscriptionRecord>
}

function loadStore(): MockStore {
  try {
    if (fs.existsSync(MOCK_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(MOCK_STORE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return { subscriptions: {} }
}

function saveStore(store: MockStore): void {
  try {
    fs.writeFileSync(MOCK_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch { /* ignore */ }
}

// ─── Stripe Client ───────────────────────────────────────────────────────────

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key === 'your-stripe-secret-key' || key === 'sk_test_placeholder_key') {
    return null
  }
  return new Stripe(key)
}

// ─── Subscription Management ─────────────────────────────────────────────────

/**
 * Get the subscription/plan status for an organization.
 */
export async function getOrgSubscription(orgId: string): Promise<SubscriptionRecord> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!isMock) {
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('plan_tier, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end')
        .eq('id', orgId)
        .single()
      if (org) {
        return {
          organization_id: orgId,
          stripe_customer_id: org.stripe_customer_id,
          stripe_subscription_id: org.stripe_subscription_id,
          plan_tier: org.plan_tier || 'none',
          subscription_status: org.subscription_status || 'none',
          current_period_end: org.current_period_end,
          updated_at: new Date().toISOString(),
        }
      }
    } catch { /* fall through */ }
  }

  // Mock fallback
  const store = loadStore()
  const sub = store.subscriptions[orgId]
  if (sub) return sub

  // Default: free tier with no active subscription
  return {
    organization_id: orgId,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    plan_tier: 'none',
    subscription_status: 'none',
    current_period_end: null,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Update an organization's subscription state.
 * Persists to both Supabase (if configured) and mock store.
 */
export async function updateOrgSubscription(
  orgId: string,
  updates: {
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    plan_tier?: 'standard' | 'premium' | 'none'
    subscription_status?: SubscriptionStatus | 'none'
    current_period_end?: string | null
  }
): Promise<SubscriptionRecord> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  const now = new Date().toISOString()
  const payload: any = { ...updates, updated_at: now }

  // Update Supabase
  if (!isMock) {
    try {
      await supabase
        .from('organizations')
        .update(payload)
        .eq('id', orgId)
    } catch (err) {
      console.warn('[Billing] Failed to update Supabase org subscription:', err)
    }

    // Also update profile's plan_tier for legacy compatibility
    try {
      await supabase
        .from('profiles')
        .update({ plan_tier: updates.plan_tier || 'none', updated_at: now })
        .eq('organization_id', orgId)
    } catch (err) {
      console.warn('[Billing] Failed to update profile plan_tier:', err)
    }
  }

  // Update mock store
  const store = loadStore()
  const current = store.subscriptions[orgId] || {
    organization_id: orgId,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    plan_tier: 'none' as const,
    subscription_status: 'none' as const,
    current_period_end: null,
    updated_at: now,
  }

  store.subscriptions[orgId] = {
    ...current,
    ...updates,
    updated_at: now,
  }
  saveStore(store)

  return store.subscriptions[orgId]
}

/**
 * Determine the plan tier from a Stripe Price ID.
 */
export function getPlanTierFromPrice(priceId: string): 'standard' | 'premium' | null {
  switch (priceId) {
    case PRICE_IDS.STANDARD_MONTHLY:
      return 'standard'
    case PRICE_IDS.PREMIUM_MONTHLY:
      return 'premium'
    default:
      return null
  }
}

/**
 * Create a Stripe Checkout Session for subscription.
 * Returns the session URL for redirect.
 */
export async function createCheckoutSession(
  orgId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  customerEmail?: string,
  rewardfulRef?: string
): Promise<{ url?: string; sessionId?: string; error?: string }> {
  // Mock mode
  const stripe = getStripeClient()
  if (!stripe) {
    // In mock mode, simulate a successful checkout by updating the subscription directly
    const plan = getPlanTierFromPrice(priceId)
    if (!plan) return { error: 'Invalid price ID' }

    await updateOrgSubscription(orgId, {
      stripe_customer_id: 'cus_mock_' + Math.random().toString(36).substring(2, 10),
      stripe_subscription_id: 'sub_mock_' + Math.random().toString(36).substring(2, 10),
      plan_tier: plan,
      subscription_status: 'active',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    return {
      url: successUrl,
      sessionId: 'cs_mock_' + Math.random().toString(36).substring(2, 10),
    }
  }

  try {
    // Build session metadata — always include orgId + optional rewardful referral
    const sessionMetadata: Record<string, string> = { organization_id: orgId }
    if (rewardfulRef) {
      sessionMetadata.rewardful = rewardfulRef
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata: sessionMetadata,
      subscription_data: {
        metadata: sessionMetadata,
      },
    })

    return { url: session.url || undefined, sessionId: session.id }
  } catch (err: any) {
    console.error('[Billing] Failed to create checkout session:', err)
    return { error: err.message || 'Failed to create checkout session' }
  }
}

/**
 * Cancel an active subscription.
 */
export async function cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
  const stripe = getStripeClient()
  if (!stripe) {
    return { success: true } // Mock mode
  }

  try {
    await stripe.subscriptions.cancel(subscriptionId)
    return { success: true }
  } catch (err: any) {
    console.error('[Billing] Failed to cancel subscription:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Handle a subscription update from Stripe webhook payload.
 * Maps Stripe subscription status to our internal state.
 */
export function parseSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active': return 'active'
    case 'incomplete': return 'incomplete'
    case 'incomplete_expired': return 'incomplete_expired'
    case 'past_due': return 'past_due'
    case 'canceled': return 'canceled'
    case 'unpaid': return 'unpaid'
    case 'trialing': return 'trialing'
    default: return 'incomplete'
  }
}

/**
 * Determine if a subscription status grants access to the platform.
 */
export function isSubscriptionActive(status: SubscriptionStatus | 'none'): boolean {
  return status === 'active' || status === 'trialing'
}

/**
 * Check if a subscription has access to a specific feature.
 */
export function checkFeatureAccess(
  subscription: SubscriptionRecord,
  feature: 'dunning' | 'team' | 'custom_domain' | 'white_label' | 'api_access'
): FeatureCheck {
  const hasActiveSub = isSubscriptionActive(subscription.subscription_status)
  const plan = subscription.plan_tier

  switch (feature) {
    case 'dunning':
      // Dunning campaigns require at least standard plan
      if (!hasActiveSub || plan === 'none') {
        return {
          allowed: false,
          reason: 'An active subscription is required to run dunning campaigns.',
          plan,
        }
      }
      return { allowed: true, plan }

    case 'team':
      // Team access (multi-user) requires premium
      if (!hasActiveSub || plan !== 'premium') {
        return {
          allowed: false,
          reason: 'Multi-user team access requires a Premium plan.',
          plan,
        }
      }
      return { allowed: true, plan }

    case 'custom_domain':
      // Custom domain requires premium
      if (!hasActiveSub || plan !== 'premium') {
        return {
          allowed: false,
          reason: 'Custom domain verification requires a Premium plan.',
          plan,
        }
      }
      return { allowed: true, plan }

    case 'white_label':
      // White-labeling requires premium
      if (!hasActiveSub || plan !== 'premium') {
        return {
          allowed: false,
          reason: 'White-labeling requires a Premium plan.',
          plan,
        }
      }
      return { allowed: true, plan }

    case 'api_access':
      if (!hasActiveSub || plan === 'none') {
        return {
          allowed: false,
          reason: 'API access requires an active subscription.',
          plan,
        }
      }
      return { allowed: true, plan }

    default:
      return { allowed: false, reason: 'Unknown feature.', plan }
  }
}

/**
 * Enforce a subscription requirement for a feature.
 * Returns a 402/403 Response if not allowed, or null if allowed.
 * Use in API routes to gate features.
 */
export async function requireSubscription(
  orgId: string,
  feature: 'dunning' | 'team' | 'custom_domain' | 'white_label' | 'api_access'
): Promise<{ allowed: boolean; response?: Response }> {
  const subscription = await getOrgSubscription(orgId)
  const check = checkFeatureAccess(subscription, feature)

  if (!check.allowed) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: check.reason,
          code: 'subscription_required',
          required_plan: feature === 'dunning' ? 'standard' : 'premium',
          current_plan: check.plan,
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      ),
    }
  }

  return { allowed: true }
}