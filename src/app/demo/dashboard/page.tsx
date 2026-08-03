import { getDemoState } from '@/lib/demo/state'
import { DemoBanner } from '@/components/demo/DemoBanner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, Mail, Target, Zap, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign,
  Mail,
  Target,
  Zap,
}

export default function DemoDashboardPage() {
  const state = getDemoState()

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

  return (
    <>
      <DemoBanner />
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {state.organization.name}
            </h1>
            <p className="text-slate-500">Welcome back, {state.from_name}. Here's your recovery overview.</p>
          </div>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
            <Link href="/signup">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="font-medium">Stripe connected</span>
          <span className="text-green-600">— 12 invoices synced (demo data)</span>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-4">
          {state.stats.map((stat) => {
            const Icon = ICON_MAP[stat.icon] || DollarSign
            return (
              <Card key={stat.name} className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">{stat.name}</CardTitle>
                  <Icon className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Two-column: Recent Activity + Upcoming Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Recent Activity */}
          <Card className="col-span-4 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {state.recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-4">
                    <div className="mt-1 rounded-full bg-slate-100 p-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        Email sent to {log.recipient_email}
                      </p>
                      <p className="text-xs text-slate-500">
                        Invoice: {log.invoice_number} &bull;{' '}
                        {log.sent_at ? format(new Date(log.sent_at), 'MMM d, h:mm a') : 'Just now'}
                      </p>
                    </div>
                    <div className="ml-auto shrink-0">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.status === 'sent'
                            ? 'bg-blue-50 text-blue-700'
                            : log.status === 'opened'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Actions */}
          <Card className="col-span-3 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Upcoming Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {state.upcomingActions.map((action) => (
                  <div key={action.id} className="flex items-center">
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none">
                        Step {action.step_number} — {action.client_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">Invoice: {action.invoice_number}</p>
                    </div>
                    <div className="ml-auto text-right shrink-0">
                      <p className="text-xs font-medium text-indigo-600">
                        {format(new Date(action.next_action_at), 'MMM d')}
                      </p>
                      <p className="text-[10px] text-slate-400">Scheduled</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns table preview */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Active Campaigns</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/demo/campaigns">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="py-3 pr-4">Client / Invoice</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Started</th>
                    <th className="py-3 pr-4">Next Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {state.campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900">{c.client_name}</div>
                        <div className="text-xs text-slate-500 font-mono">#{c.invoice_number}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            c.status === 'recovered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'active'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {format(new Date(c.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 pr-4">
                        {c.next_action_at ? (
                          <span className="text-indigo-600 font-medium">
                            {format(new Date(c.next_action_at), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 p-8 text-center text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Ready to recover your real invoices?</h2>
          <p className="text-indigo-200 mb-6 max-w-md mx-auto">
            Connect your Stripe account in 30 seconds and let Reclaim AI handle the follow-ups while you focus on your work.
          </p>
          <Button asChild size="lg" variant="secondary" className="bg-white text-indigo-700 hover:bg-indigo-50">
            <Link href="/signup">
              Connect Stripe & Start Recovery <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </>
  )
}
