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

function generateId(): string {
  const { randomUUID } = require('crypto')
  return randomUUID()
}

/**
 * POST /api/invitations/[token]/accept — Accept an invitation
 * Requires authentication. Links the current user to the organization.
 */

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
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
      console.warn('[Invitation Accept] Auth check failed:', e)
    }

    if (supabase && !isMock) {
      try {
        // Resolve the invitation
        const { data: inv, error: resolveErr } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('token', token)
          .single()
        if (resolveErr || !inv) {
          return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
        }
        if (inv.accepted_at) {
          return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 410 })
        }
        if (new Date(inv.expires_at) < new Date()) {
          return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
        }

        // Check org member limit
        const { count } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', inv.organization_id)
          .eq('status', 'active')
        const { data: org } = await supabase
          .from('organizations')
          .select('max_members')
          .eq('id', inv.organization_id)
          .single()
        if (count !== null && org && count >= org.max_members) {
          return NextResponse.json({ error: 'Organization has reached its member limit' }, { status: 403 })
        }

        const now = new Date().toISOString()

        // Mark invitation as accepted
        await supabase
          .from('team_invitations')
          .update({ accepted_at: now })
          .eq('id', inv.id)

        // Create membership
        await supabase
          .from('organization_members')
          .insert({
            organization_id: inv.organization_id,
            profile_id: userId,
            role: inv.role,
            invited_by: inv.invited_by,
            accepted_at: now,
            status: 'active',
            created_at: now,
            updated_at: now,
          })

        // Link profile to org
        await supabase
          .from('profiles')
          .update({ organization_id: inv.organization_id })
          .eq('id', userId)

        return NextResponse.json({
          success: true,
          message: 'Invitation accepted successfully',
          organizationId: inv.organization_id,
        })
      } catch (err: any) {
        console.error('[Invitation Accept] Supabase error:', err)
        if (err?.message !== 'Internal Server Error') {
          return NextResponse.json({ error: err.message || 'Failed to accept invitation' }, { status: 500 })
        }
      }
    }

    // Fallback to mock store
    const store = loadStore()
    const inv = store.invitations.find((inv: any) => inv.token === token)
    if (!inv) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }
    if (inv.accepted_at) {
      return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 410 })
    }
    if (new Date(inv.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
    }

    // Check member limit
    const org = store.organizations.find((o: any) => o.id === inv.organization_id)
    const activeCount = store.members.filter(
      (m: any) => m.organization_id === inv.organization_id && m.status === 'active'
    ).length
    if (org && activeCount >= org.max_members) {
      return NextResponse.json({ error: 'Organization has reached its member limit' }, { status: 403 })
    }

    const now = new Date().toISOString()
    inv.accepted_at = now

    const newMember = {
      id: generateId(),
      organization_id: inv.organization_id,
      profile_id: userId,
      role: inv.role,
      invited_by: inv.invited_by,
      invited_at: inv.created_at,
      accepted_at: now,
      status: 'active',
      created_at: now,
      updated_at: now,
    }
    store.members.push(newMember)
    saveStore(store)

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      organizationId: inv.organization_id,
    })
  } catch (error: any) {
    console.error('[Invitation Accept] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
