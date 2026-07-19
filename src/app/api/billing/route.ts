import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getOrgSubscription, checkFeatureAccess, isSubscriptionActive } from '@/lib/billing'
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

/**
 * GET /api/billing — Get current org's subscription status and feature access
 */
export async function GET(request: Request) {
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
      console.warn('[Billing API] Auth check failed:', e)
    }

    let orgId: string | null = null

    if (supabase && !isMock) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userId)
          .single()
        if (profile?.organization_id) orgId = profile.organization_id
      } catch { /* fall through */ }
    }

    if (!orgId) {
      const store = loadStore()
      const member = store.members?.find((m: any) => m.profile_id === userId && m.status === 'active')
      if (member) orgId = member.organization_id
    }

    if (!orgId) {
      return NextResponse.json({
        subscription: null,
        features: {},
        message: 'No organization found',
      })
    }

    const subscription = await getOrgSubscription(orgId)
    const hasActiveSub = isSubscriptionActive(subscription.subscription_status)

    const features = {
      dunning: checkFeatureAccess(subscription, 'dunning'),
      team: checkFeatureAccess(subscription, 'team'),
      custom_domain: checkFeatureAccess(subscription, 'custom_domain'),
      white_label: checkFeatureAccess(subscription, 'white_label'),
      api_access: checkFeatureAccess(subscription, 'api_access'),
    }

    return NextResponse.json({
      subscription: {
        ...subscription,
        hasActiveSubscription: hasActiveSub,
      },
      features,
    })
  } catch (error: any) {
    console.error('[Billing API] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}