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
 * DELETE /api/team/members/[id] — Remove a team member (admin only)
 * PATCH /api/team/members/[id] — Change a member's role (admin only)
 */

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: memberId } = await params
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
      console.warn('[Team Member API] Auth check failed:', e)
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

    // Prevent removing yourself
    if (supabase && !isMock) {
      try {
        const { data: targetMember } = await supabase
          .from('organization_members')
          .select('profile_id')
          .eq('id', memberId)
          .single()
        if (targetMember?.profile_id === userId) {
          return NextResponse.json({ error: 'You cannot remove yourself from the organization' }, { status: 400 })
        }
      } catch { /* fall through */ }
    } else {
      const store = loadStore()
      const targetMember = store.members.find((m: any) => m.id === memberId)
      if (targetMember?.profile_id === userId) {
        return NextResponse.json({ error: 'You cannot remove yourself from the organization' }, { status: 400 })
      }
    }

    // Perform deletion
    if (supabase && !isMock) {
      try {
        const { error } = await supabase
          .from('organization_members')
          .delete()
          .eq('id', memberId)
          .eq('organization_id', orgId)
        if (!error) {
          return NextResponse.json({ success: true, message: 'Member removed successfully' })
        }
      } catch { /* fall through */ }
    }

    // Fallback to mock
    const store = loadStore()
    const idx = store.members.findIndex((m: any) => m.id === memberId && m.organization_id === orgId)
    if (idx === -1) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    store.members.splice(idx, 1)
    saveStore(store)
    return NextResponse.json({ success: true, message: 'Member removed successfully' })
  } catch (error: any) {
    console.error('[Team Member API] DELETE error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: memberId } = await params
    let userId = 'mock-user-id'
    let supabase: any = null
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

    const body = await request.json()
    const { role: newRole } = body
    if (!newRole || !['admin', 'member'].includes(newRole)) {
      return NextResponse.json({ error: 'Role must be "admin" or "member"' }, { status: 400 })
    }

    try {
      supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch (e) {
      console.warn('[Team Member API] Auth check failed:', e)
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

    if (supabase && !isMock) {
      try {
        const now = new Date().toISOString()
        const { data, error } = await supabase
          .from('organization_members')
          .update({ role: newRole, updated_at: now })
          .eq('id', memberId)
          .eq('organization_id', orgId)
          .select()
          .single()
        if (!error && data) {
          return NextResponse.json({ member: data, message: 'Role updated successfully' })
        }
      } catch { /* fall through */ }
    }

    // Fallback to mock
    const store = loadStore()
    const idx = store.members.findIndex((m: any) => m.id === memberId && m.organization_id === orgId)
    if (idx === -1) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    store.members[idx].role = newRole
    store.members[idx].updated_at = new Date().toISOString()
    saveStore(store)
    return NextResponse.json({ member: store.members[idx], message: 'Role updated successfully' })
  } catch (error: any) {
    console.error('[Team Member API] PATCH error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
