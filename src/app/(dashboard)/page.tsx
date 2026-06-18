import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  DollarSign, 
  BarChart3, 
  ArrowUpRight,
  Activity,
  AlertCircle,
  Mail
} from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h1 className="text-2xl font-bold">Please log in</h1>
        <p className="text-slate-500">You need to be logged in to view your dashboard.</p>
        <Button asChild>
          <Link href="/login">Login</Link>
        </Button>
      </div>
    )
  }

  // 1. Fetch Integrations to check state
  const { data: connections } = await supabase
    .from('oauth_connections')
    .select('provider, status')
    .eq('profile_id', user.id)

  const hasIntegrations = connections && connections.length > 0
  const activeIntegrations = connections?.filter(c => c.status === 'active') || []

  // 2. Fetch Outstanding Invoices
  const { data: openInvoices } = await supabase
    .from('invoices')
    .select('amount_due_cents')
    .eq('profile_id', user.id)
    .eq('status', 'open')

  const totalOutstandingCents = openInvoices?.reduce((acc, inv) => acc + Number(inv.amount_due_cents), 0) || 0

  // 3. Fetch Total Recovered
  const { data: recoveries } = await supabase
    .from('recoveries')
    .select('amount_recovered_cents')
    .eq('profile_id', user.id)

  const totalRecoveredCents = recoveries?.reduce((acc, rec) => acc + Number(rec.amount_recovered_cents), 0) || 0

  // 4. Recovery Rate
  const { count: totalCampaigns } = await supabase
    .from('dunning_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)

  const { count: recoveredCampaigns } = await supabase
    .from('dunning_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('status', 'recovered')

  const recoveryRate = totalCampaigns && totalCampaigns > 0 
    ? (recoveredCampaigns || 0) / totalCampaigns * 100 
    : 0

  // 5. Recent Activity (Email Logs)
  const { data: recentLogs } = await supabase
    .from('dunning_email_logs')
    .select(`
      id,
      sent_at,
      recipient_email,
      sent_subject,
      status,
      invoices (
        invoice_number
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  // 6. Upcoming Actions
  const { data: upcomingActions } = await supabase
    .from('dunning_campaigns')
    .select(`
      id,
      next_action_at,
      invoices (
        invoice_number
      )
    `)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .not('next_action_at', 'is', null)
    .order('next_action_at', { ascending: true })
    .limit(5)

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const stats = [
    { 
      name: 'Total Outstanding', 
      value: formatCurrency(totalOutstandingCents), 
      icon: DollarSign, 
      description: 'Open invoices awaiting payment',
      color: 'text-blue-600' 
    },
    { 
      name: 'Recovery Rate', 
      value: `${recoveryRate.toFixed(1)}%`, 
      icon: BarChart3, 
      description: 'Success rate of dunning campaigns',
      color: 'text-green-600' 
    },
    { 
      name: 'Total Recovered', 
      value: formatCurrency(totalRecoveredCents), 
      icon: Users, 
      description: 'Revenue saved through Reclaim AI',
      color: 'text-indigo-600' 
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500">
            {activeIntegrations.length > 0 
              ? `Connected to ${activeIntegrations.map(i => i.provider).join(' & ')}.` 
              : 'Welcome back to Reclaim AI.'}
          </p>
        </div>
        {!hasIntegrations && (
          <Button asChild variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900">
            <Link href="/settings">
              <AlertCircle className="mr-2 h-4 w-4" />
              Connect Integration
            </Link>
          </Button>
        )}
      </div>

      {!hasIntegrations ? (
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-slate-100 p-3 mb-4">
              <Activity className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No data to display yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-2 mb-6">
              Connect your Stripe or QuickBooks account to start syncing invoices and automating your recovery process.
            </p>
            <Button asChild>
              <Link href="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.name} className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                  <stat.icon className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-slate-500 mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {recentLogs && recentLogs.length > 0 ? (
                    recentLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start space-x-4">
                        <div className="mt-1 rounded-full bg-slate-100 p-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            Email sent to {log.recipient_email}
                          </p>
                          <p className="text-xs text-slate-500">
                            Invoice: {log.invoices?.invoice_number || 'N/A'} • {log.sent_at ? format(new Date(log.sent_at), 'MMM d, h:mm a') : 'Just now'}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-slate-500 italic">
                      No recent activity found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Upcoming Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {upcomingActions && upcomingActions.length > 0 ? (
                    upcomingActions.map((action: any) => (
                      <div key={action.id} className="flex items-center">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">Next Reminder</p>
                          <p className="text-xs text-slate-500">
                            Invoice: {action.invoices?.invoice_number || 'N/A'}
                          </p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-xs font-medium text-indigo-600">
                            {format(new Date(action.next_action_at), 'MMM d')}
                          </p>
                          <p className="text-[10px] text-slate-400">Scheduled</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-slate-500 italic">
                      No upcoming actions scheduled.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
