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
  try {
    fs.writeFileSync(ORG_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch { /* ignore */ }
}

/**
 * GET /api/team/members — List all members of the current user's organization
 * POST /api/team/members — Invite a new team member (admin only)
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
      console.warn('[Team API] Auth check failed:', e)
    }

    let orgId: string | null = null
    let userRole: string | null = null

    // Resolve org from Supabase
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

    // Fallback to mock store
    if (!orgId) {
      const store = loadStore()
      const existingMember = store.members.find((m: any) => m.profile_id === userId && m.status === 'active')
      if (existingMember) {
        orgId = existingMember.organization_id
        userRole = existingMember.role
      } else {
        return NextResponse.json({ members: [] })
      }
    }

    // Fetch members
    let members: any[] = []

    if (supabase && !isMock && orgId) {
      try {
        const { data, error } = await supabase
          .from('organization_members')
          .select(`
            id, organization_id, profile_id, role, invited_by, invited_at,
            accepted_at, status, created_at, updated_at,
            profile:profiles!profile_id (business_name, contact_email)
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: true })
        if (!error && data) {
          members = data.map((m: any) => ({
            ...m,
            profile_name: m.profile?.business_name || '',
            profile_email: m.profile?.contact_email || '',
          }))
        }
      } catch { /* fall through */ }
    }

    // Fallback to mock
    if (members.length === 0 && orgId) {
      const store = loadStore()
      members = store.members.filter((m: any) => m.organization_id === orgId)
    }

    return NextResponse.json({ members, organizationId: orgId, role: userRole })
  } catch (error: any) {
    console.error('[Team API] GET error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
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
      console.warn('[Team API] Auth check failed:', e)
    }

    const body = await request.json()
    const { email, role: inviteRole } = body
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (inviteRole && !['admin', 'member'].includes(inviteRole)) {
      return NextResponse.json({ error: 'Role must be "admin" or "member"' }, { status: 400 })
    }
    const targetRole = inviteRole || 'member'

    let orgId: string | null = null
    let userRole: string | null = null

    // Resolve org + check admin
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
      const existingMember = store.members.find((m: any) => m.profile_id === userId && m.status === 'active')
      if (existingMember) {
        orgId = existingMember.organization_id
        userRole = existingMember.role
      }
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Check admin role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 })
    }

    // Create invitation
    const { createInvitation } = await import('@/lib/team')
    const result = await createInvitation(orgId, userId, email, targetRole as 'admin' | 'member')

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    return NextResponse.json({ invitation: result.invitation, message: 'Invitation sent successfully' }, { status: 201 })
  } catch (error: any) {
    console.error('[Team API] POST error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
