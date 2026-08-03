import { getDemoState } from '@/lib/demo/state'
import { DemoBanner } from '@/components/demo/DemoBanner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpRight, DollarSign, Mail, Target, Zap } from 'lucide-react'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatCompact(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`
  return `$${dollars.toFixed(0)}`
}

export default function DemoAnalyticsPage() {
  const { analytics } = getDemoState()
  const { summary, monthly, recentRecoveries } = analytics

  return (
    <>
      <DemoBanner />
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-slate-500">Track your recovery performance over time. (Demo data)</p>
        </div>

        {/* Summary KPI cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total Recovered', value: formatCurrency(summary.totalRecoveredCents), sub: `${summary.recoveredCampaigns} campaigns`, icon: DollarSign },
            { label: 'Recovery Rate', value: `${summary.recoveryRate}%`, sub: `${summary.recoveredCampaigns} of ${summary.totalCampaigns} resolved`, icon: Target },
            { label: 'Active Campaigns', value: summary.activeCampaigns.toString(), sub: `${summary.totalCampaigns} total`, icon: Zap },
            { label: 'Avg Recovery', value: formatCurrency(summary.averageRecoveryAmount), sub: 'per campaign', icon: ArrowUpRight },
          ].map((kpi) => {
            const Icon = kpi.icon
            return (
              <Card key={kpi.label} className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">{kpi.label}</CardTitle>
                  <Icon className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
                  <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Email performance + monthly */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Email Performance */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Email Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Sent', value: summary.totalEmailsSent },
                  { label: 'Delivered', value: summary.deliveredEmails, pct: `${summary.deliveryRate}%` },
                  { label: 'Opened', value: summary.openedEmails, pct: `${summary.openRate}%` },
                  { label: 'Bounced', value: summary.bouncedEmails },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{row.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{row.value}</span>
                      {row.pct && (
                        <span className="text-xs text-slate-400 tabular-nums">({row.pct})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Simple bar */}
              <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden flex">
                <div className="h-full bg-indigo-500" style={{ width: `${summary.deliveryRate}%` }} />
                <div className="h-full bg-emerald-500" style={{ width: `${summary.openRate}%` }} />
              </div>
              <div className="flex gap-4 mt-1.5 text-[10px] text-slate-400">
                <span>■ Delivered {summary.deliveryRate}%</span>
                <span>■ Opened {summary.openRate}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Recovery */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Monthly Recovery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthly.map((m) => (
                  <div key={`${m.month}-${m.year}`} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-12 shrink-0">{m.month.slice(0, 3)}</span>
                    <div className="flex-1 h-5 rounded bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded bg-indigo-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (m.recoveredCents / 350000) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-700 w-16 text-right shrink-0 tabular-nums">
                      {m.recoveredCents > 0 ? formatCompact(m.recoveredCents) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Recoveries */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Recoveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRecoveries.map((r) => (
                <div key={r.invoiceNumber} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium text-slate-900">{r.clientName}</div>
                    <div className="text-xs text-slate-500 font-mono">#{r.invoiceNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-emerald-700">{formatCurrency(r.amountCents)}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(r.recoveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
