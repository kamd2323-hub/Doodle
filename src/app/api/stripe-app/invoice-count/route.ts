import { NextResponse } from 'next/server'
import { lookupOrgByStripeAccount, countPastDueInvoices } from '@/lib/stripe-app'

/**
 * GET /api/stripe-app/invoice-count?stripe_account_id=acct_xxx
 *
 * Returns the number of past-due invoices and total amount outstanding
 * for the Reclaim AI account connected to the given Stripe account.
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

    // Look up the org by Stripe account
    const org = await lookupOrgByStripeAccount(stripeAccountId)

    if (!org) {
      // No Reclaim AI account connected — return zero counts
      return NextResponse.json({
        pastDueCount: 0,
        totalPastDueCents: 0,
        connected: false,
      })
    }

    const counts = await countPastDueInvoices(org.orgId)

    return NextResponse.json({
      ...counts,
      connected: true,
    })
  } catch (error: any) {
    console.error('[StripeApp InvoiceCount] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'