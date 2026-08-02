import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { buildAnalyticsSnapshot, seedMockAnalyticsData } from '@/lib/analytics'
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
 * GET /api/analytics
 * Returns the full analytics snapshot for the current user's organization.
 * 
 * Query params:
 *  - seed: string — if "true", seeds mock analytics data for testing
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shouldSeed = searchParams.get('seed') === 'true'

    if (shouldSeed) {
      seedMockAnalyticsData()
      return NextResponse.json({
        message: 'Mock analytics data seeded',
        note: 'Reload analytics to see data',
      })
    }

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
      console.warn('[Analytics API] Auth check failed:', e)
    }

    // Resolve organization_id
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
      const member = store.members?.find(
        (m: any) => m.profile_id === userId && m.status === 'active'
      )
      if (member) orgId = member.organization_id
    }

    // Fallback: if still no org, use a mock org
    if (!orgId) {
      const store = loadStore()
      if (store.organizations?.length > 0) {
        orgId = store.organizations[0].id
      } else {
        // Last resort: create a temp mock org ID so analytics can still work
        orgId = '00000000-0000-0000-0000-000000000001'
      }
    }

    const snapshot = await buildAnalyticsSnapshot(orgId)

    return NextResponse.json(snapshot)
  } catch (error: any) {
    console.error('[Analytics API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 30 // revalidate every 30 seconds