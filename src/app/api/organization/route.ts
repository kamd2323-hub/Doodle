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

function saveStore(store: any): void {
  try { fs.writeFileSync(ORG_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8') } catch { /* ignore */ }
}

/**
 * GET /api/organization — Get current user's organization settings
 * PUT /api/organization — Update organization settings (admin only)
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
      console.warn('[Org API] Auth check failed:', e)
    }

    let orgId: string | null = null
    let userRole: string | null = null

    // Resolve from Supabase
    if (supabase && !isMock) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userId)
          .single()
        if (profile?.organization_id) {
          orgId = profile.organization_id
          const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', orgId)
            .eq('profile_id', userId)
            .eq('status', 'active')
            .single()
          if (membership) userRole = membership.role
        }
      } catch { /* fall through */ }
    }

    // Fallback to mock
    if (!orgId) {
      const store = loadStore()
      const existingMember = store.members.find((m: any) => m.profile_id === userId && m.status === 'active')
      if (existingMember) {
        orgId = existingMember.organization_id
        userRole = existingMember.role
      } else {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 })
      }
    }

    // Fetch org
    let org: any = null

    if (supabase && !isMock && orgId) {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single()
        if (!error && data) org = data
      } catch { /* fall through */ }
    }

    if (!org) {
      const store = loadStore()
      org = store.organizations.find((o: any) => o.id === orgId)
    }

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Count members
    let memberCount = 0
    if (supabase && !isMock && orgId) {
      try {
        const { count } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'active')
        if (count !== null) memberCount = count
      } catch { /* fall through */ }
    }
    if (memberCount === 0) {
      const store = loadStore()
      memberCount = store.members.filter((m: any) => m.organization_id === orgId && m.status === 'active').length
    }

    return NextResponse.json({
      organization: org,
      role: userRole,
      memberCount,
      maxMembers: org.max_members,
    })
  } catch (error: any) {
    console.error('[Org API] GET error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    let userId = 'mock-user-id'
    let supabase: any = null
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

    const body = await request.json()
    const allowedFields = ['name', 'billing_email', 'custom_domain', 'logo_url', 'primary_color', 'from_name', 'from_email']
    const updates: any = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    try {
      supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch (e) {
      console.warn('[Org API] Auth check failed:', e)
    }

    let orgId: string | null = null
    let userRole: string | null = null

    if (supabase && !isMock) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userId)
          .single()
        if (profile?.organization_id) {
          orgId = profile.organization_id
          const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', orgId)
            .eq('profile_id', userId)
            .eq('status', 'active')
            .single()
          if (membership) userRole = membership.role
        }
      } catch { /* fall through */ }
    }

    if (!orgId) {
      const store = loadStore()
      const m = store.members.find((m: any) => m.profile_id === userId && m.status === 'active')
      if (m) {
        orgId = m.organization_id
        userRole = m.role
      }
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 })
    }

    updates.updated_at = new Date().toISOString()

    if (supabase && !isMock) {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .update(updates)
          .eq('id', orgId)
          .select()
          .single()
        if (!error && data) {
          return NextResponse.json({ organization: data, message: 'Organization updated successfully' })
        }
      } catch { /* fall through */ }
    }

    // Fallback to mock
    const store = loadStore()
    const idx = store.organizations.findIndex((o: any) => o.id === orgId)
    if (idx === -1) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    store.organizations[idx] = { ...store.organizations[idx], ...updates }
    saveStore(store)
    return NextResponse.json({ organization: store.organizations[idx], message: 'Organization updated successfully' })
  } catch (error: any) {
    console.error('[Org API] PUT error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
