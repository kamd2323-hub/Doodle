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
 * GET /api/invitations/[token] — Resolve an invitation by token (public)
 * POST /api/invitations/[token]/accept — Accept an invitation (authenticated)
 */

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'
    let supabase: any = null

    try {
      supabase = await createClient()
    } catch { /* ignore */ }

    if (supabase && !isMock) {
      try {
        const { data, error } = await supabase
          .from('team_invitations')
          .select(`
            id, organization_id, invited_by, email, role, token, expires_at, accepted_at, created_at,
            organization:organizations!organization_id(name, logo_url),
            inviter:profiles!invited_by(business_name)
          `)
          .eq('token', token)
          .single()
        if (!error && data) {
          if (data.accepted_at) {
            return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 410 })
          }
          if (new Date(data.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
          }
          return NextResponse.json({
            invitation: {
              id: data.id,
              organization_id: data.organization_id,
              email: data.email,
              role: data.role,
              expires_at: data.expires_at,
            },
            organization: {
              name: data.organization?.name,
              logo_url: data.organization?.logo_url,
            },
            invited_by: data.inviter?.business_name || 'Someone',
          })
        }
      } catch { /* fall through */ }
    }

    // Fallback to mock
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

    const org = store.organizations.find((o: any) => o.id === inv.organization_id)
    return NextResponse.json({
      invitation: {
        id: inv.id,
        organization_id: inv.organization_id,
        email: inv.email,
        role: inv.role,
        expires_at: inv.expires_at,
      },
      organization: {
        name: org?.name,
        logo_url: org?.logo_url,
      },
      invited_by: 'An admin',
    })
  } catch (error: any) {
    console.error('[Invitations API] GET error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
