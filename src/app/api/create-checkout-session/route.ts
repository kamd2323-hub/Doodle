import { NextResponse } from 'next/server'

const PRICE_IDS: Record<string, { priceId: string; name: string; amount: number }> = {
  standard: {
    priceId: 'price_1TsjLKDExcDNxwkFkbIxelhO',
    name: 'Standard',
    amount: 2900, // $29
  },
  premium: {
    priceId: 'price_1TsjLSDExcDNxwkFxxyF3xTa',
    name: 'Premium',
    amount: 7900, // $79
  },
}

/**
 * POST /api/create-checkout-session
 *
 * Creates a Stripe Checkout Session for the given plan.
 * Body: { plan: 'standard' | 'premium' }
 * Returns: { url: string } — the Stripe Checkout URL to redirect to.
 *
 * In mock mode (no real Stripe key), returns a simulated payment link
 * using the live Stripe payment links from the catalog.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { plan } = body

    if (!plan || !PRICE_IDS[plan]) {
      return NextResponse.json({ error: 'Invalid plan. Choose "standard" or "premium".' }, { status: 400 })
    }

    const planInfo = PRICE_IDS[plan]
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const isMock = !stripeKey || stripeKey === 'your-stripe-secret-key' || stripeKey.includes('placeholder')

    if (isMock) {
      // Mock mode: return a simulated checkout URL
      const origin = new URL(request.url).origin
      const mockSuccessUrl = `${origin}/settings?tab=billing&checkout=success&plan=${plan}`
      const mockCancelUrl = `${origin}/settings?tab=billing&checkout=cancelled`

      // Simulate a brief delay
      await new Promise(r => setTimeout(r, 300))

      return NextResponse.json({
        url: mockSuccessUrl,
        mock: true,
        message: `[MOCK] Redirecting to ${planInfo.name} checkout (${planInfo.name === 'Premium' ? '$79' : '$29'}/mo)`,
      })
    }

    // Real Stripe checkout
    const Stripe = require('stripe')
    const stripe = new Stripe(stripeKey)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: planInfo.priceId,
          quantity: 1,
        },
      ],
      success_url: `${new URL(request.url).origin}/settings?tab=billing&checkout=success&plan=${plan}`,
      cancel_url: `${new URL(request.url).origin}/settings?tab=billing&checkout=cancelled`,
      metadata: {
        plan,
        source: 'reclaim-ai-settings',
      },
    })

    if (!session.url) {
      throw new Error('Stripe returned no checkout URL')
    }

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('[Checkout] Error creating session:', error)
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 })
  }
}