import { NextResponse } from 'next/server'
import { lookupOrgByStripeAccount, computeActivation } from '@/lib/stripe-app'

/**
 * POST /api/stripe-app/activate
 *
 * Activates dunning for the given Stripe account, or returns the
 * next step the user needs to take (connect Stripe, complete billing, etc.).
 *
 * Body: { stripe_account_id: string }
 *
 * Called from the Stripe App dashboard extension when the user
 * clicks "Start Recovering" or similar CTA.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const stripeAccountId = body.stripe_account_id

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Missing stripe_account_id in request body' },
        { status: 400 }
      )
    }

    const org = await lookupOrgByStripeAccount(stripeAccountId)

    if (!org) {
      return NextResponse.json({
        success: false,
        nextStep: 'connect_stripe',
        message: 'No Reclaim AI account found for this Stripe account. Connect your Stripe account to get started.',
        redirectUrl: '/settings',
      })
    }

    const result = await computeActivation(org)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[StripeApp Activate] Error:', error)

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'