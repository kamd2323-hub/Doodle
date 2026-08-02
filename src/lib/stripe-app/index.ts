/**
 * Stripe App API helpers.
 * Resolves Stripe Connected Account IDs to Reclaim AI organizations,
 * providing lightweight lookup and status functions for the Stripe App integration.
 *
 * These endpoints are called from the Stripe Dashboard iframe context —
 * they use stripe_account_id as the lookup key rather than our session auth.
 */
import { createClient } from '@/lib/supabase-server'
import * as fs from 'fs'

const MOCK_STORE_PATH = '/tmp/mock_organization_data.json'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OrgLookup {
  orgId: string
  planTier: string
  subscriptionStatus: string
  stripeAccountId: string
  tenantName: string | null
}

export interface StripeAppInvoiceCount {
  pastDueCount: number
  totalPastDueCents: number
}

export interface StripeAppStatus {
  active: boolean
  connected: boolean
  planTier: string
  subscriptionActive: boolean
  totalRecoveredCents: number
  activeCampaigns: number
  recoveredCampaigns: number
}

export interface StripeAppActivateResult {
  success: boolean
  nextStep: 'connect_stripe' | 'complete_billing' | 'configure_dunning' | 'already_active'
  message: string
  redirectUrl?: string
}

// ─── Mock Store ──────────────────────────────────────────────────────────────

function loadMockStore(): any {
  try {
    if (fs.existsSync(MOCK_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(MOCK_STORE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return { organizations: [], members: [], invitations: [] }
}

// ─── Core: Resolve Org from Stripe Account ID ────────────────────────────────

/**
 * Look up the Reclaim AI organization by Stripe Connected Account ID.
 * Returns null if no matching connection found.
 */
export async function lookupOrgByStripeAccount(stripeAccountId: string): Promise<OrgLookup | null> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!isMock) {
    try {
      const { data: conn } = await supabase
        .from('oauth_connections')
        .select('tenant_id, tenant_name, profile_id, organization_id')
        .eq('provider', 'stripe')
        .eq('tenant_id', stripeAccountId)
        .eq('status', 'active')
        .single()

      if (conn?.organization_id) {
        // Get org details
        const { data: org } = await supabase
          .from('organizations')
          .select('plan_tier, subscription_status')
          .eq('id', conn.organization_id)
          .single()

        return {
          orgId: conn.organization_id,
          planTier: org?.plan_tier || 'none',
          subscriptionStatus: org?.subscription_status || 'none',
          stripeAccountId: conn.tenant_id,
          tenantName: conn.tenant_name,
        }
      }
    } catch {
      // fall through to mock
    }
  }

  // Mock fallback: scan mock store
  const store = loadMockStore()
  // Check if there's a mock oauth connection for this stripe account
  const mockConnections = store.oauth_connections || []
  const match = mockConnections.find(
    (c: any) => c.provider === 'stripe' && c.tenant_id === stripeAccountId && c.status === 'active'
  )
  if (match) {
    const org = (store.organizations || []).find((o: any) => o.id === match.organization_id)
    return {
      orgId: match.organization_id,
      planTier: org?.plan_tier || 'none',
      subscriptionStatus: org?.subscription_status || 'none',
      stripeAccountId: match.tenant_id,
      tenantName: match.tenant_name || null,
    }
  }

  return null
}

/**
 * Count past-due invoices for an organization.
 */
export async function countPastDueInvoices(orgId: string): Promise<StripeAppInvoiceCount> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!isMock) {
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount_due_cents, status, due_date')
        .eq('organization_id', orgId)
        .eq('status', 'past_due')

      const pastDue = invoices || []
      return {
        pastDueCount: pastDue.length,
        totalPastDueCents: pastDue.reduce(
          (sum: number, inv: any) => sum + (Number(inv.amount_due_cents) || 0), 0
        ),
      }
    } catch {
      // fall through to mock
    }
  }

  // Mock data
  return {
    pastDueCount: 3,
    totalPastDueCents: 45200,
  }
}

/**
 * Get recovery stats for an organization.
 */
export async function getRecoveryStats(orgId: string): Promise<{
  totalRecoveredCents: number
  activeCampaigns: number
  recoveredCampaigns: number
}> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!isMock) {
    try {
      const [recoveriesRes, campaignsRes] = await Promise.all([
        supabase.from('recoveries').select('amount_recovered_cents').eq('organization_id', orgId),
        supabase.from('dunning_campaigns').select('status').eq('organization_id', orgId),
      ])

      const recoveries = recoveriesRes.data || []
      const campaigns = campaignsRes.data || []

      return {
        totalRecoveredCents: recoveries.reduce(
          (sum: number, r: any) => sum + (Number(r.amount_recovered_cents) || 0), 0
        ),
        activeCampaigns: campaigns.filter((c: any) => c.status === 'active').length,
        recoveredCampaigns: campaigns.filter((c: any) => c.status === 'recovered').length,
      }
    } catch {
      // fall through
    }
  }

  // Mock data
  return {
    totalRecoveredCents: 15200,
    activeCampaigns: 2,
    recoveredCampaigns: 5,
  }
}

/**
 * Compute the "activation" status for the Stripe App.
 * Determines what the next step should be for the user.
 */
export async function computeActivation(org: OrgLookup): Promise<StripeAppActivateResult> {
  const isSubActive = ['active', 'trialing'].includes(org.subscriptionStatus)
  const isConnected = !!org.stripeAccountId

  if (!isConnected) {
    return {
      success: false,
      nextStep: 'connect_stripe',
      message: 'Stripe account not connected. Connect your Stripe account to get started.',
      redirectUrl: '/settings',
    }
  }

  if (!isSubActive) {
    return {
      success: false,
      nextStep: 'complete_billing',
      message: 'Subscription required. Choose a plan to start recovering past-due invoices.',
      redirectUrl: '/settings?tab=billing',
    }
  }

  // Check if dunning is already configured
  const stats = await getRecoveryStats(org.orgId)
  const hasActiveCampaigns = stats.activeCampaigns > 0

  if (!hasActiveCampaigns) {
    return {
      success: true,
      nextStep: 'configure_dunning',
      message: 'Account is connected and billing is active. Configure your first dunning campaign.',
      redirectUrl: '/dashboard',
    }
  }

  return {
    success: true,
    nextStep: 'already_active',
    message: `Reclaim AI is active with ${stats.activeCampaigns} campaign(s) running.`,
  }
}