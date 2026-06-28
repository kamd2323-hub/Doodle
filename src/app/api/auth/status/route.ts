import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import * as fs from 'fs'

const FALLBACK_FILE_PATH = '/tmp/mock_oauth_connections.json'

export async function GET(request: Request) {
  try {
    let userId = 'mock-user-id'
    let supabase: any = null

    try {
      supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    } catch (e) {
      console.warn('Supabase auth failed in status API, using mock-user-id:', e)
    }

    // Default status
    let stripeConnected = false
    let quickbooksConnected = false
    let stripeTenantName = ''
    let quickbooksTenantName = ''

    // 1. Try to read from Supabase if configured
    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your-supabase-url') {
      try {
        const { data, error } = await supabase
          .from('oauth_connections')
          .select('provider, tenant_name')
          .eq('profile_id', userId)

        if (!error && data) {
          const stripeConn = data.find((conn: any) => conn.provider === 'stripe')
          const qboConn = data.find((conn: any) => conn.provider === 'quickbooks')
          
          if (stripeConn) {
            stripeConnected = true
            stripeTenantName = stripeConn.tenant_name
          }
          if (qboConn) {
            quickbooksConnected = true
            quickbooksTenantName = qboConn.tenant_name
          }
        }
      } catch (err) {
        console.warn('Supabase fetch failed in status API, falling back to local storage:', err)
      }
    }

    // 2. Fallback: Always check the local mock JSON file to merge statuses (highly robust!)
    if (fs.existsSync(FALLBACK_FILE_PATH)) {
      try {
        const fileContent = fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8')
        const connections = JSON.parse(fileContent)
        const userConnections = connections.filter((c: any) => c.profile_id === userId)
        
        const stripeMock = userConnections.find((c: any) => c.provider === 'stripe')
        if (stripeMock) {
          stripeConnected = true
          stripeTenantName = stripeMock.tenant_name || stripeTenantName
        }
        
        const qboMock = userConnections.find((c: any) => c.provider === 'quickbooks')
        if (qboMock) {
          quickbooksConnected = true
          quickbooksTenantName = qboMock.tenant_name || quickbooksTenantName
        }
      } catch (err) {
        console.error('Error reading fallback store in status API:', err)
      }
    }

    // 3. Resolve Organization context (multi-user Phase 3)
    let organizationId: string | null = null
    let organizationName: string | null = null
    let userRole: string | null = null
    let memberCount = 0
    let maxMembers = 1
    let planTier: string | null = null

    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your-supabase-url' &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-project.supabase.co') {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userId)
          .single()
        if (profile?.organization_id) {
          organizationId = profile.organization_id
          const { data: org } = await supabase
            .from('organizations')
            .select('name, max_members, plan_tier')
            .eq('id', organizationId)
            .single()
          if (org) {
            organizationName = org.name
            maxMembers = org.max_members
            planTier = org.plan_tier
          }
          const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', organizationId)
            .eq('profile_id', userId)
            .eq('status', 'active')
            .single()
          if (membership) userRole = membership.role
          const { count } = await supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'active')
          if (count !== null) memberCount = count
        }
      } catch (err) {
        console.warn('Supabase org context fetch failed:', err)
      }
    }

    // Fallback to local mock org store
    if (!organizationId) {
      const ORG_STORE_PATH = '/tmp/mock_organization_data.json'
      try {
        if (fs.existsSync(ORG_STORE_PATH)) {
          const store = JSON.parse(fs.readFileSync(ORG_STORE_PATH, 'utf-8'))
          const existingMember = store.members?.find((m: any) => m.profile_id === userId && m.status === 'active')
          if (existingMember) {
            organizationId = existingMember.organization_id
            userRole = existingMember.role
            const org = store.organizations?.find((o: any) => o.id === organizationId)
            if (org) {
              organizationName = org.name
              maxMembers = org.max_members
              planTier = org.plan_tier
            }
            memberCount = store.members?.filter(
              (m: any) => m.organization_id === organizationId && m.status === 'active'
            ).length || 0
          }
        }
      } catch (err) {
        console.warn('Fallback org store read failed:', err)
      }
    }

    return NextResponse.json({
      integrations: {
        stripe: {
          connected: stripeConnected,
          name: 'Stripe',
          tenantName: stripeTenantName,
        },
        quickbooks: {
          connected: quickbooksConnected,
          name: 'QuickBooks Online',
          tenantName: quickbooksTenantName,
        }
      },
      organization: organizationId ? {
        id: organizationId,
        name: organizationName,
        role: userRole,
        memberCount,
        maxMembers,
        planTier,
      } : null,
    })
  } catch (error: any) {
    console.error('Status route error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
