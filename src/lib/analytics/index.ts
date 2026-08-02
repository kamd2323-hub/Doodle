/**
 * Server-side Analytics Library for Reclaim AI.
 * Aggregates recovery, campaign, and email delivery metrics scoped per organization.
 * Uses dual-persistence: Supabase first, then mock fallback.
 */
import { createClient } from '@/lib/supabase-server'
import * as fs from 'fs'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnalyticsSnapshot {
  summary: {
    totalRecoveredCents: number
    recoveryRate: number      // percentage (0–100)
    totalCampaigns: number
    activeCampaigns: number
    recoveredCampaigns: number
    failedCampaigns: number
    totalEmailsSent: number
    deliveredEmails: number
    openedEmails: number
    bouncedEmails: number
    deliveryRate: number       // percentage (0–100)
    openRate: number           // percentage (0–100)  based on delivered
    averageRecoveryAmount: number
  }
  monthly: MonthlyBucket[]
  campaignBreakdown: CampaignStatusBreakdown
  emailPerformance: EmailPerformance
  recentRecoveries: RecentRecovery[]
}

export interface MonthlyBucket {
  month: string
  year: number
  recoveredCents: number
  emailsSent: number
  campaignsCreated: number
}

export interface CampaignStatusBreakdown {
  active: number
  recovered: number
  failed: number
  paused: number
  completed: number
}

export interface EmailPerformance {
  total: number
  sent: number
  opened: number
  bounced: number
  failed: number
  deliveryRate: number
  openRate: number
}

export interface RecentRecovery {
  id: string
  invoiceId: string
  invoiceNumber: string
  clientName: string
  amountCents: number
  recoveredAt: string
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_STORE_PATH = '/tmp/mock_analytics_data.json'

interface MockAnalyticsStore {
  recoveries: any[]
  campaigns: any[]
  emailLogs: any[]
  clients: any[]
  invoices: any[]
}

function loadMockStore(): MockAnalyticsStore {
  try {
    if (fs.existsSync(MOCK_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(MOCK_STORE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return { recoveries: [], campaigns: [], emailLogs: [], clients: [], invoices: [] }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLast6Months(): { month: string; year: number }[] {
  const result: { month: string; year: number }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      month: d.toLocaleString('en-US', { month: 'short' }),
      year: d.getFullYear(),
    })
  }
  return result
}

/** Check if a date falls in a given month+year bucket */
function inMonthBucket(dateStr: string, bucket: { month: string; year: number }): boolean {
  const d = new Date(dateStr)
  return (
    d.toLocaleString('en-US', { month: 'short' }) === bucket.month &&
    d.getFullYear() === bucket.year
  )
}

function safePercent(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 1000) / 10 // 1 decimal
}

// ─── Core Aggregation ────────────────────────────────────────────────────────

/**
 * Build the full analytics snapshot for an organization.
 * Accepts an orgId to scope all queries.
 */
export async function buildAnalyticsSnapshot(orgId: string): Promise<AnalyticsSnapshot> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  let recoveries: any[] = []
  let campaigns: any[] = []
  let emailLogs: any[] = []
  let clients: any[] = []
  let invoices: any[] = []

  if (!isMock) {
    try {
      const results = await Promise.allSettled([
        supabase.from('recoveries').select('id, amount_recovered_cents, recovered_at, invoice_id').eq('organization_id', orgId),
        supabase.from('dunning_campaigns').select('id, status').eq('organization_id', orgId),
        supabase.from('dunning_email_logs').select('status, sent_at').eq('organization_id', orgId).order('sent_at', { ascending: false }),
        supabase.from('invoices').select('id, invoice_number, client_id').eq('organization_id', orgId),
        supabase.from('clients').select('id, name').eq('organization_id', orgId),
      ])

      if (results[0].status === 'fulfilled') recoveries = results[0].value.data || []
      if (results[1].status === 'fulfilled') campaigns = results[1].value.data || []
      if (results[2].status === 'fulfilled') emailLogs = results[2].value.data || []
      if (results[3].status === 'fulfilled') invoices = results[3].value.data || []
      if (results[4].status === 'fulfilled') clients = results[4].value.data || []
    } catch {
      // fall through to mock
    }
  }

  if (recoveries.length === 0 && campaigns.length === 0 && emailLogs.length === 0) {
    // Try mock store
    const mock = loadMockStore()
    if (mock.recoveries.length > 0) recoveries = mock.recoveries
    if (mock.campaigns.length > 0) campaigns = mock.campaigns
    if (mock.emailLogs.length > 0) emailLogs = mock.emailLogs
    if (mock.clients.length > 0) clients = mock.clients
    if (mock.invoices.length > 0) invoices = mock.invoices
  }

  // ─── Summary Metrics ──────────────────────────────────────────────────
  const totalRecoveredCents = recoveries.reduce(
    (sum: number, r: any) => sum + (Number(r.amount_recovered_cents) || 0), 0
  )

  const totalCampaigns = campaigns.length
  const recoveredCampaigns = campaigns.filter((c: any) => c.status === 'recovered').length
  const activeCampaigns = campaigns.filter((c: any) => c.status === 'active').length
  const failedCampaigns = campaigns.filter((c: any) => c.status === 'failed').length
  const recoveryRate = totalCampaigns > 0
    ? Math.round((recoveredCampaigns / totalCampaigns) * 1000) / 10
    : 0

  const totalEmailsSent = emailLogs.length
  const deliveredEmails = emailLogs.filter((e: any) =>
    e.status === 'sent' || e.status === 'delivered'
  ).length
  const openedEmails = emailLogs.filter((e: any) => e.status === 'opened').length
  const bouncedEmails = emailLogs.filter((e: any) => e.status === 'bounced').length

  const deliveryRate = safePercent(deliveredEmails, totalEmailsSent)
  const openRate = safePercent(openedEmails, deliveredEmails)
  const averageRecoveryAmount = recoveries.length > 0
    ? Math.round(totalRecoveredCents / recoveries.length)
    : 0

  // ─── Monthly Breakdown ────────────────────────────────────────────────
  const months = getLast6Months()
  const monthly = months.map(bucket => {
    const bucketRecoveries = recoveries.filter((r: any) =>
      r.recovered_at && inMonthBucket(r.recovered_at, bucket))
    const bucketEmails = emailLogs.filter((e: any) =>
      e.sent_at && inMonthBucket(e.sent_at, bucket))
    const bucketCampaigns = campaigns.filter((c: any) => true) // campaigns don't have creation dates in schema

    return {
      month: bucket.month,
      year: bucket.year,
      recoveredCents: bucketRecoveries.reduce(
        (sum: number, r: any) => sum + (Number(r.amount_recovered_cents) || 0), 0),
      emailsSent: bucketEmails.length,
      campaignsCreated: 0, // can't track without created_at on campaigns
    }
  })

  // ─── Campaign Status Breakdown ────────────────────────────────────────
  const campaignBreakdown: CampaignStatusBreakdown = {
    active: activeCampaigns,
    recovered: recoveredCampaigns,
    failed: failedCampaigns,
    paused: campaigns.filter((c: any) => c.status === 'paused').length,
    completed: campaigns.filter((c: any) =>
      c.status === 'completed' || c.status === 'recovered').length,
  }

  // ─── Email Performance ────────────────────────────────────────────────
  const emailPerformance: EmailPerformance = {
    total: totalEmailsSent,
    sent: deliveredEmails,
    opened: openedEmails,
    bounced: bouncedEmails,
    failed: emailLogs.filter((e: any) => e.status === 'failed').length,
    deliveryRate,
    openRate,
  }

  // ─── Recent Recoveries ────────────────────────────────────────────────
  // Build client + invoice lookup maps
  const clientMap = new Map(clients.map((c: any) => [c.id, c.name]))
  const invoiceMap = new Map(invoices.map((inv: any) => [inv.id, inv]))

  const recentRecoveries: RecentRecovery[] = recoveries
    .filter((r: any) => r.recovered_at)
    .sort((a: any, b: any) =>
      new Date(b.recovered_at).getTime() - new Date(a.recovered_at).getTime())
    .slice(0, 5)
    .map((r: any) => {
      const inv = invoiceMap.get(r.invoice_id)
      return {
        id: r.id,
        invoiceId: r.invoice_id || 'unknown',
        invoiceNumber: inv?.invoice_number || '—',
        clientName: inv ? clientMap.get(inv.client_id) || 'Unknown Client' : 'Unknown Client',
        amountCents: Number(r.amount_recovered_cents) || 0,
        recoveredAt: r.recovered_at,
      }
    })

  return {
    summary: {
      totalRecoveredCents,
      recoveryRate,
      totalCampaigns,
      activeCampaigns,
      recoveredCampaigns,
      failedCampaigns,
      totalEmailsSent,
      deliveredEmails,
      openedEmails,
      bouncedEmails,
      deliveryRate,
      openRate,
      averageRecoveryAmount,
    },
    monthly,
    campaignBreakdown,
    emailPerformance,
    recentRecoveries,
  }
}

/**
 * Seed mock analytics data for testing.
 */
export function seedMockAnalyticsData(): void {
  const now = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']

  const mockClients = [
    { id: 'c1', name: 'Acme Corp' },
    { id: 'c2', name: 'Beta LLC' },
    { id: 'c3', name: 'Gamma Inc' },
  ]

  const mockInvoices = [
    { id: 'inv1', invoice_number: 'INV-2026-001', client_id: 'c1' },
    { id: 'inv2', invoice_number: 'INV-2026-002', client_id: 'c2' },
    { id: 'inv3', invoice_number: 'INV-2026-003', client_id: 'c3' },
    { id: 'inv4', invoice_number: 'INV-2026-004', client_id: 'c1' },
  ]

  const mockRecoveries: any[] = []
  for (let m = 1; m <= 7; m++) {
    const count = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), m - 1, Math.floor(Math.random() * 28) + 1)
      mockRecoveries.push({
        id: `rec-${m}-${i}`,
        amount_recovered_cents: Math.floor(Math.random() * 50000) + 1000,
        recovered_at: d.toISOString(),
        invoice_id: mockInvoices[Math.floor(Math.random() * mockInvoices.length)].id,
      })
    }
  }

  const mockCampaigns = [
    { id: 'cmp1', status: 'recovered' },
    { id: 'cmp2', status: 'active' },
    { id: 'cmp3', status: 'active' },
    { id: 'cmp4', status: 'failed' },
    { id: 'cmp5', status: 'recovered' },
    { id: 'cmp6', status: 'paused' },
    { id: 'cmp7', status: 'completed' },
  ]

  const mockEmailLogs: any[] = []
  for (let m = 1; m <= 7; m++) {
    const count = Math.floor(Math.random() * 8) + 3
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), m - 1, Math.floor(Math.random() * 28) + 1)
      const rand = Math.random()
      const status = rand < 0.7 ? 'sent' : rand < 0.85 ? 'opened' : rand < 0.95 ? 'bounced' : 'failed'
      mockEmailLogs.push({ status, sent_at: d.toISOString() })
    }
  }

  fs.writeFileSync(MOCK_STORE_PATH, JSON.stringify({
    recoveries: mockRecoveries,
    campaigns: mockCampaigns,
    emailLogs: mockEmailLogs,
    clients: mockClients,
    invoices: mockInvoices,
  }, null, 2))
}