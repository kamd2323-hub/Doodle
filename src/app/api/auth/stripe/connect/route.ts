import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    let userId = 'mock-user-id'
    let isMock = false

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      } else {
        // For testing/QA if not logged in, we can proceed with a mock user
        isMock = true
      }
    } catch (e) {
      console.warn('Supabase auth check failed (using mock session):', e)
      isMock = true
    }

    const clientId = process.env.STRIPE_CLIENT_ID || 'ca_placeholder_12345'
    const redirectUri = process.env.STRIPE_REDIRECT_URI || `${new URL(request.url).origin}/api/auth/stripe/callback`
    const state = crypto.randomUUID()

    // Construct the Stripe Connect OAuth URL
    const stripeAuthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_only&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

    const response = NextResponse.redirect(stripeAuthUrl)
    
    // Store CSRF state in cookie
    response.cookies.set('stripe_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
    })

    return response
  } catch (error: any) {
    console.error('Stripe Connect error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
