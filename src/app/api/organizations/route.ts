import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
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
 * GET /api/organizations — List all organizations the current user belongs to
 */
export async function GET() {
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
    } catch { /* fall through */ }

    let organizations: any[] = []

    if (supabase && !isMock) {
      try {
        const { data } = await supabase
          .from('organization_members')
          .select(`
            organization_id,
            role,
            organization:organizations!organization_id (id, name, logo_url, plan_tier)
          `)
          .eq('profile_id', userId)
          .eq('status', 'active')

        if (data) {
          organizations = data.map((m: any) => ({
            id: m.organization?.id || m.organization_id,
            name: m.organization?.name || 'Unnamed Organization',
            logo_url: m.organization?.logo_url,
            plan_tier: m.organization?.plan_tier || 'standard',
            role: m.role,
          }))
        }
      } catch { /* fall through */ }
    }

    // Fallback to mock
    if (organizations.length === 0) {
      const store = loadStore()
      if (store.members && store.organizations) {
        const userMemberships = store.members.filter((m: any) => m.profile_id === userId && m.status === 'active')
        organizations = userMemberships.map((m: any) => {
          const org = store.organizations.find((o: any) => o.id === m.organization_id)
          return {
            id: m.organization_id,
            name: org?.name || 'My Organization',
            logo_url: org?.logo_url,
            plan_tier: org?.plan_tier || 'standard',
            role: m.role,
          }
        })
      }
    }

    // If no orgs at all, create a default one
    if (organizations.length === 0) {
      const store = loadStore()
      const defaultOrg = {
        id: 'default-org',
        name: 'My Organization',
        plan_tier: 'standard' as const,
        max_members: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      store.organizations.push(defaultOrg)
      store.members.push({
        id: `mem-${Date.now()}`,
        organization_id: defaultOrg.id,
        profile_id: userId,
        role: 'admin',
        status: 'active',
        invited_by: userId,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      saveStore(store)
      organizations.push({
        id: defaultOrg.id,
        name: defaultOrg.name,
        plan_tier: defaultOrg.plan_tier,
        role: 'admin',
      })
    }

    return NextResponse.json({ organizations })
  } catch (error: any) {
    console.error('[Organizations API] GET error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

function saveStore(store: any): void {
  try { fs.writeFileSync(ORG_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8') } catch { /* ignore */ }
}
