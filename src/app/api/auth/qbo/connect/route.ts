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
        isMock = true
      }
    } catch (e) {
      console.warn('Supabase auth check failed for QBO redirect (using mock session):', e)
      isMock = true
    }

    const clientId = process.env.QBO_CLIENT_ID || 'qbo_placeholder_client_id_12345'
    const redirectUri = process.env.QBO_REDIRECT_URI || `${new URL(request.url).origin}/api/auth/qbo/callback`
    const state = crypto.randomUUID()

    // QBO OAuth 2.0 Scopes: accounting, openid, profile, email
    const scope = 'com.intuit.quickbooks.accounting openid profile email'
    
    // Construct the QBO Authorization URL
    const qboAuthUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&response_type=code&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

    const response = NextResponse.redirect(qboAuthUrl)
    
    // Store CSRF state in cookie
    response.cookies.set('qbo_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
    })

    return response
  } catch (error: any) {
    console.error('QBO Connect Redirect error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
