import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { createCheckoutSession, PRICE_IDS } from '@/lib/billing'
import * as fs from 'fs'

const ORG_STORE_PATH = '/tmp/mock_organization_data.json'

function loadStore(): any {
  try {
    if (fs.existsSync(ORG_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(ORG_STORE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return { organizations: [], members: [], invitations: [] }
}

export async function POST(request: Request) {
  try {
    let userId = 'mock-user-id'
    let supabase: any = null
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

    try {
      supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch (e) {
      console.warn('[Checkout API] Auth check failed:', e)
    }

    let orgId: string | null = null
    let userEmail: string | undefined

    if (supabase && !isMock) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id, contact_email')
          .eq('id', userId)
          .single()
        if (profile?.organization_id) {
          orgId = profile.organization_id
          userEmail = profile.contact_email || undefined
        }
      } catch { /* fall through */ }
    }

    if (!orgId) {
      const store = loadStore()
      const member = store.members?.find((m: any) => m.profile_id === userId && m.status === 'active')
      if (member) orgId = member.organization_id
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body = await request.json()
    const { priceId, successUrl, cancelUrl } = body

    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 })
    }

    const validPrices = Object.values(PRICE_IDS)
    if (!validPrices.includes(priceId)) {
      return NextResponse.json({
        error: 'Invalid price ID',
        validPrices,
      }, { status: 400 })
    }

    // Read Rewardful referral cookie for affiliate commission tracking
    const cookieHeader = request.headers.get('cookie') || ''
    const rewardfulMatch = cookieHeader.match(/(?:^|;\s*)_rewardful_id=([^;]+)/)
    const rewardfulRef = rewardfulMatch ? decodeURIComponent(rewardfulMatch[1]) : undefined

    const result = await createCheckoutSession(
      orgId,
      priceId,
      successUrl || `${request.headers.get('origin') || 'http://localhost:3000'}/settings?tab=billing`,
      cancelUrl || `${request.headers.get('origin') || 'http://localhost:3000'}/settings?tab=billing`,
      userEmail,
      rewardfulRef
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      url: result.url,
      sessionId: result.sessionId,
    })
  } catch (error: any) {
    console.error('[Checkout API] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
