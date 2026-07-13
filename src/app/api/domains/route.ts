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

interface DomainRecord {
  type: string
  name: string
  value: string
  priority?: string
}

interface DomainData {
  id: string
  domain: string
  status: 'unverified' | 'pending' | 'verified'
  records: DomainRecord[]
  created_at: string
}

function getDomainRecords(domain: string): DomainRecord[] {
  return [
    { type: 'TXT', name: `resend-verification`, value: `v=resend-v1:${Buffer.from(domain).toString('hex').slice(0, 12)}` },
    { type: 'CNAME', name: `email.${domain}`, value: `feedback-smtp.us-east-1.amazonses.com` },
    { type: 'MX', name: 'feedback', value: 'feedback-smtp.us-east-1.amazonses.com', priority: '10' },
    { type: 'TXT', name: domain, value: 'v=spf1 include:amazonses.com ~all' },
  ]
}

async function resolveOrgId(userId: string): Promise<{ orgId: string | null; role: string | null }> {
  let supabase: any = null
  let orgId: string | null = null
  let role: string | null = null
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  try {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch { /* fall through */ }

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
        if (membership) role = membership.role
      }
    } catch { /* fall through */ }
  }

  if (!orgId) {
    const store = loadStore()
    const member = store.members.find((m: any) => m.profile_id === userId && m.status === 'active')
    if (member) {
      orgId = member.organization_id
      role = member.role
    }
  }

  return { orgId, role }
}

/**
 * GET /api/domains — Get current domain registration
 * POST /api/domains — Register a new domain
 * POST /api/domains/verify — Trigger domain verification check
 */
export async function GET() {
  try {
    const { orgId } = await resolveOrgId('mock-user-id')
    if (!orgId) {
      return NextResponse.json({ domain: null })
    }

    let supabase: any = null
    try { supabase = await createClient() } catch { /* */ }
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url'

    let domain: string | null = null
    let domainStatus: string = 'unverified'

    if (supabase && !isMock) {
      try {
        const { data: org } = await supabase
          .from('organizations')
          .select('custom_domain, domain_status')
          .eq('id', orgId)
          .single()
        if (org) {
          domain = org.custom_domain || null
          domainStatus = org.domain_status || 'unverified'
        }
      } catch { /* fall through */ }
    }

    if (!domain) {
      const store = loadStore()
      const org = store.organizations.find((o: any) => o.id === orgId)
      if (org) {
        domain = org.custom_domain || null
        domainStatus = org.domain_status || 'unverified'
      }
    }

    const domainData: DomainData | null = domain
      ? {
          id: `domain-${orgId}`,
          domain,
          status: domainStatus as 'unverified' | 'pending' | 'verified',
          records: getDomainRecords(domain),
          created_at: new Date().toISOString(),
        }
      : null

    return NextResponse.json({ domain: domainData })
  } catch (error: any) {
    console.error('[Domains API] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, domain } = body

    if (!action || !domain) {
      return NextResponse.json({ error: 'action and domain are required' }, { status: 400 })
    }

    const { orgId, role } = await resolveOrgId('mock-user-id')
    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 })
    }

    if (action === 'register') {
      // Save the domain to the organization
      let supabase: any = null
      try { supabase = await createClient() } catch { /* */ }
      const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url'

      let success = false

      if (supabase && !isMock) {
        try {
          const { error } = await supabase
            .from('organizations')
            .update({ custom_domain: domain, domain_status: 'pending' })
            .eq('id', orgId)
          if (!error) success = true
        } catch { /* fall through */ }
      }

      if (!success) {
        const store = loadStore()
        const idx = store.organizations.findIndex((o: any) => o.id === orgId)
        if (idx !== -1) {
          store.organizations[idx].custom_domain = domain
          store.organizations[idx].domain_status = 'pending'
          saveStore(store)
          success = true
        }
      }

      if (!success) {
        return NextResponse.json({ error: 'Failed to register domain' }, { status: 500 })
      }

      const domainData: DomainData = {
        id: `domain-${orgId}`,
        domain,
        status: 'pending',
        records: getDomainRecords(domain),
        created_at: new Date().toISOString(),
      }

      return NextResponse.json({ domain: domainData, message: 'Domain registered. Add the DNS records below.' })
    }

    if (action === 'verify') {
      // In mock mode, immediately succeed
      let supabase: any = null
      try { supabase = await createClient() } catch { /* */ }
      const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url'

      if (supabase && !isMock) {
        try {
          await supabase
            .from('organizations')
            .update({ domain_status: 'verified' })
            .eq('id', orgId)
        } catch { /* fall through */ }
      }

      const store = loadStore()
      const idx = store.organizations.findIndex((o: any) => o.id === orgId)
      if (idx !== -1) {
        store.organizations[idx].domain_status = 'verified'
        saveStore(store)
      }

      return NextResponse.json({ status: 'verified', message: 'Domain verified successfully!' })
    }

    return NextResponse.json({ error: 'Unknown action. Use "register" or "verify".' }, { status: 400 })
  } catch (error: any) {
    console.error('[Domains API] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
