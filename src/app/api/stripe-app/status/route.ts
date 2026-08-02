import { NextResponse } from 'next/server'
import { lookupOrgByStripeAccount, getRecoveryStats } from '@/lib/stripe-app'

/**
 * GET /api/stripe-app/status?stripe_account_id=acct_xxx
 *
 * Returns whether the given Stripe account has Reclaim AI active,
 * plus basic recovery statistics for display in the Stripe App.
 *
 * Called from the Stripe App dashboard extension.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stripeAccountId = searchParams.get('stripe_account_id')

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Missing stripe_account_id query parameter' },
        { status: 400 }
      )
    }

    const org = await lookupOrgByStripeAccount(stripeAccountId)

    if (!org) {
      return NextResponse.json({
        active: false,
        connected: false,
        planTier: 'none',
        subscriptionActive: false,
        totalRecoveredCents: 0,
        activeCampaigns: 0,
        recoveredCampaigns: 0,
      })
    }

    const stats = await getRecoveryStats(org.orgId)
    const isSubActive = ['active', 'trialing'].includes(org.subscriptionStatus)

    return NextResponse.json({
      active: isSubActive && stats.activeCampaigns > 0,
      connected: true,
      planTier: org.planTier,
      subscriptionActive: isSubActive,
      totalRecoveredCents: stats.totalRecoveredCents,
      activeCampaigns: stats.activeCampaigns,
      recoveredCampaigns: stats.recoveredCampaigns,
    })
  } catch (error: any) {
    console.error('[StripeApp Status] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'