import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase-server'
import { MonthlyRecoveryChart, CampaignStatusChart, TrendIndicator } from '@/components/dashboard/analytics-charts'
import {
  DollarSign,
  Mail,
  Target,
  Zap,
  ArrowUpRight,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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

function getLast6Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toLocaleString('en-US', { month: 'short' }))
  }
  return months
}

// ── Page ────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const supabase = await createClient()

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

  // ── Fetch data ──────────────────────────────────────────────────────

  // 1. Total recovered
  const { data: recoveries } = await supabase
    .from('recoveries')
    .select('amount_recovered_cents, recovered_at')
    .eq('profile_id', user.id)
    .order('recovered_at', { ascending: false })

  const totalRecoveredCents = recoveries?.reduce(
    (sum: number, r: any) => sum + Number(r.amount_recovered_cents || 0), 0
  ) || 0

  // 2. Campaign stats
  const { data: allCampaigns } = await supabase
    .from('dunning_campaigns')
    .select('status')
    .eq('profile_id', user.id)

  const totalCampaigns = allCampaigns?.length || 0
  const recoveredCount = allCampaigns?.filter((c: any) => c.status === 'recovered').length || 0
  const activeCount = allCampaigns?.filter((c: any) => c.status === 'active').length || 0
  const failedCount = allCampaigns?.filter((c: any) => c.status === 'failed').length || 0
  const pendingCount = totalCampaigns - recoveredCount - activeCount - failedCount

  // 3. Email logs
  const { data: emailLogs } = await supabase
    .from('dunning_email_logs')
    .select('status, sent_at')
    .order('sent_at', { ascending: false })

  const totalEmails = emailLogs?.length || 0
  const deliveredEmails = emailLogs?.filter((e: any) => e.status === 'sent' || e.status === 'delivered').length || 0
  const openedEmails = emailLogs?.filter((e: any) => e.status === 'opened').length || 0
  const bouncedEmails = emailLogs?.filter((e: any) => e.status === 'bounced').length || 0
  const deliveryRate = totalEmails > 0 ? (deliveredEmails / totalEmails * 100) : 0

  // 4. Monthly data — build from recoveries
  const monthLabels = getLast6Months()
  const now = new Date()
  const monthlyData = monthLabels.map(label => {
    // Count recoveries for this month
    const monthRecoveries = recoveries?.filter((r: any) => {
      if (!r.recovered_at) return false
      const d = new Date(r.recovered_at)
      return d.toLocaleString('en-US', { month: 'short' }) === label &&
        d.getFullYear() === now.getFullYear()
    }) || []
    const recovered = monthRecoveries.reduce((sum: number, r: any) => sum + Number(r.amount_recovered_cents || 0), 0)

    // Count emails sent this month
    const monthEmails = emailLogs?.filter((e: any) => {
      if (!e.sent_at) return false
      const d = new Date(e.sent_at)
      return d.toLocaleString('en-US', { month: 'short' }) === label &&
        d.getFullYear() === now.getFullYear()
    }) || []

    return { month: label, recovered, sent: monthEmails.length }
  })

  // 5. Recovery rate
  const recoveryRate = totalCampaigns > 0 ? (recoveredCount / totalCampaigns * 100) : 0

  // 6. Top recovered invoices
  const { data: topRecoveries } = await supabase
    .from('recoveries')
    .select(`
      amount_recovered_cents,
      recovered_at,
      invoices (
        invoice_number,
        clients ( name )
      )
    `)
    .eq('profile_id', user.id)
    .order('amount_recovered_cents', { ascending: false })
    .limit(5)

  // 7. Previous month data for trend
  const prevMonthLabel = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleString('en-US', { month: 'short' })
  const prevMonthRecovered = recoveries?.filter((r: any) => {
    if (!r.recovered_at) return false
    const d = new Date(r.recovered_at)
    return d.toLocaleString('en-US', { month: 'short' }) === prevMonthLabel
  })?.reduce((sum: number, r: any) => sum + Number(r.amount_recovered_cents || 0), 0) || 0

  // ── Campaign status data for donut ─────────────────────────────────
  const campaignStatusData = [
    { label: 'Recovered', count: recoveredCount, color: '#22c55e' },
    { label: 'Active', count: activeCount, color: '#6366f1' },
    { label: 'Failed', count: failedCount, color: '#ef4444' },
    { label: 'Pending', count: pendingCount, color: '#f59e0b' },
  ].filter(s => s.count > 0)

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
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalRecoveredCents)}</div>
            <div className="flex items-center gap-2 mt-1">
              <TrendIndicator current={totalRecoveredCents} previous={prevMonthRecovered} />
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
            <div className="text-2xl font-bold text-slate-900">{recoveryRate.toFixed(1)}%</div>
            <p className="text-xs text-slate-400 mt-1">
              {recoveredCount} of {totalCampaigns} campaigns
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
            <div className="text-2xl font-bold text-slate-900">{totalEmails}</div>
            <p className="text-xs text-slate-400 mt-1">
              {deliveryRate.toFixed(1)}% delivery rate
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
            <div className="text-2xl font-bold text-slate-900">{activeCount}</div>
            <p className="text-xs text-slate-400 mt-1">
              {pendingCount} pending
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
            <CampaignStatusChart data={campaignStatusData} total={totalCampaigns} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Top Recoveries + Email Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Recoveries */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Top Recoveries</CardTitle>
            <Link href="/invoices" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {topRecoveries && topRecoveries.length > 0 ? (
              <div className="space-y-3">
                {topRecoveries.map((r: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {r.invoices?.clients?.name || r.invoices?.invoice_number || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {r.invoices?.invoice_number} &bull; {r.recovered_at
                            ? new Date(r.recovered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(Number(r.amount_recovered_cents))}
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
                    {deliveredEmails} / {totalEmails}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${totalEmails > 0 ? (deliveredEmails / totalEmails * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Opened */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">Opened</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {openedEmails} / {deliveredEmails || totalEmails}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${(deliveredEmails || totalEmails) > 0 ? (openedEmails / (deliveredEmails || totalEmails) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Bounced */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">Bounced</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {bouncedEmails} / {totalEmails}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-red-400 h-2 rounded-full transition-all"
                    style={{ width: `${totalEmails > 0 ? (bouncedEmails / totalEmails * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-800">
                    {totalEmails > 0 ? (deliveredEmails / totalEmails * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-xs text-slate-400">Delivery Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-800">
                    {deliveredEmails > 0 ? (openedEmails / deliveredEmails * 100).toFixed(1) : 0}%
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
