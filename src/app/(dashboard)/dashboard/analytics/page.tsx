import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase-server'
import { buildAnalyticsSnapshot } from '@/lib/analytics'
import { MonthlyRecoveryChart, CampaignStatusChart, TrendIndicator } from '@/components/dashboard/analytics-charts'
import {
  DollarSign,
  Mail,
  Target,
  Zap,
  ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import * as fs from 'fs'

// ── Helpers ─────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatCompact(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`
  return `$${dollars.toFixed(0)}`
}

const ORG_STORE_PATH = '/tmp/mock_organization_data.json'

function loadMockStore(): any {
  try {
    if (fs.existsSync(ORG_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(ORG_STORE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return { organizations: [], members: [] }
}

// ── Page ────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  let orgId: string | null = null

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <h1 className="text-2xl font-bold">Please log in</h1>
          <p className="text-slate-500">You need to be logged in to view analytics.</p>
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      )
    }

    // Resolve organization_id
    if (!isMock) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()
        if (profile?.organization_id) orgId = profile.organization_id
      } catch { /* fall through */ }
    }

    if (!orgId) {
      const mockStore = loadMockStore()
      const member = mockStore.members?.find(
        (m: any) => m.profile_id === user.id && m.status === 'active'
      )
      if (member) orgId = member.organization_id
    }

    if (!orgId) {
      // Last resort: use mock org
      const mockStore = loadMockStore()
      orgId = mockStore.organizations?.[0]?.id || '00000000-0000-0000-0000-000000000001'
    }

  } catch {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h1 className="text-2xl font-bold">Please log in</h1>
        <p className="text-slate-500">You need to be logged in to view analytics.</p>
        <Button asChild>
          <Link href="/login">Login</Link>
        </Button>
      </div>
    )
  }

  // ── Fetch analytics via backend library ────────────────────────────────
  const snapshot = await buildAnalyticsSnapshot(orgId ?? "")
  const { summary, monthly, campaignBreakdown, emailPerformance, recentRecoveries } = snapshot

  // Previous month for trend comparison
  const prevMonthIdx = monthly.length >= 2 ? monthly.length - 2 : 0
  const prevMonthRecovered = monthly.length >= 2
    ? monthly[prevMonthIdx].recoveredCents
    : 0

  // Monthly chart data
  const monthlyData = monthly.map(m => ({
    month: m.month,
    recovered: m.recoveredCents,
    sent: m.emailsSent,
  }))

  // Campaign status donut data
  const campaignStatusData = [
    { label: 'Recovered', count: campaignBreakdown.recovered, color: '#22c55e' },
    { label: 'Active', count: campaignBreakdown.active, color: '#6366f1' },
    { label: 'Failed', count: campaignBreakdown.failed, color: '#ef4444' },
    { label: 'Paused', count: campaignBreakdown.paused, color: '#f59e0b' },
    { label: 'Completed', count: campaignBreakdown.completed - campaignBreakdown.recovered, color: '#8b5cf6' },
  ].filter(s => s.count > 0)

  const pendingCount = summary.totalCampaigns -
    summary.activeCampaigns - summary.recoveredCampaigns - summary.failedCampaigns -
    campaignBreakdown.paused - (campaignBreakdown.completed - campaignBreakdown.recovered)

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-slate-500 mt-1">
            Track your recovery performance and campaign metrics over time.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Recovered</CardTitle>
            <div className="rounded-lg bg-emerald-50 p-1.5">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalRecoveredCents)}</div>
            <div className="flex items-center gap-2 mt-1">
              <TrendIndicator current={summary.totalRecoveredCents} previous={prevMonthRecovered} />
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Recovery Rate</CardTitle>
            <div className="rounded-lg bg-indigo-50 p-1.5">
              <Target className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.recoveryRate}%</div>
            <p className="text-xs text-slate-400 mt-1">
              {summary.recoveredCampaigns} of {summary.totalCampaigns} campaigns
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Emails Sent</CardTitle>
            <div className="rounded-lg bg-blue-50 p-1.5">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.totalEmailsSent}</div>
            <p className="text-xs text-slate-400 mt-1">
              {summary.deliveryRate}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Campaigns</CardTitle>
            <div className="rounded-lg bg-amber-50 p-1.5">
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.activeCampaigns}</div>
            <p className="text-xs text-slate-400 mt-1">
              {pendingCount > 0 ? `${pendingCount} pending` : `${summary.failedCampaigns} failed`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Monthly Recovery</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyRecoveryChart data={monthlyData} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Campaign Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <CampaignStatusChart data={campaignStatusData} total={summary.totalCampaigns} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Recoveries + Email Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Recoveries */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Recoveries</CardTitle>
            <Link href="/invoices" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentRecoveries.length > 0 ? (
              <div className="space-y-3">
                {recentRecoveries.map((r, i) => (
                  <div
                    key={r.id || i}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {r.clientName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {r.invoiceNumber} &bull; {r.recoveredAt
                            ? new Date(r.recoveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(r.amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-slate-400 italic">
                No recoveries recorded yet. Start a dunning campaign to see results here.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Performance */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Email Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Delivered */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">Delivered</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {emailPerformance.sent} / {emailPerformance.total}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${emailPerformance.deliveryRate}%` }}
                  />
                </div>
              </div>

              {/* Opened */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">Opened</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {emailPerformance.opened} / {emailPerformance.sent || emailPerformance.total}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${emailPerformance.openRate}%` }}
                  />
                </div>
              </div>

              {/* Bounced */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">Bounced</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {emailPerformance.bounced} / {emailPerformance.total}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-red-400 h-2 rounded-full transition-all"
                    style={{ width: `${emailPerformance.total > 0 ? (emailPerformance.bounced / emailPerformance.total * 100).toFixed(1) : 0}%` }}
                  />
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-800">
                    {emailPerformance.deliveryRate}%
                  </div>
                  <div className="text-xs text-slate-400">Delivery Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-800">
                    {emailPerformance.openRate}%
                  </div>
                  <div className="text-xs text-slate-400">Open Rate</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}