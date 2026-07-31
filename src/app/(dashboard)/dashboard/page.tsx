import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  DollarSign,
  BarChart3,
  Activity,
  AlertCircle,
  Mail,
  Building2
} from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SystemStatusBadge } from '@/components/dashboard/system-status'
import * as fs from 'fs'

const ORG_STORE_PATH = '/tmp/mock_organization_data.json'

function loadOrgStore(): any {
  try {
    if (fs.existsSync(ORG_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(ORG_STORE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return { organizations: [], members: [], invitations: [], invoices: [], recoveries: [] }
}

interface DashboardPageProps {
  searchParams: Promise<{ org_id?: string }>
}

export default async function DashboardPage(props: DashboardPageProps) {
  const searchParams = await props.searchParams
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

  // Resolve active organization_id
  let orgId = searchParams?.org_id
  let orgName = ''
  let userRole: string | null = null
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!orgId) {
    if (!isMock) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()
        if (profile?.organization_id) {
          orgId = profile.organization_id
        }
      } catch { /* fall through */ }
    }

    if (!orgId) {
      const store = loadOrgStore()
      if (store.members) {
        const membership = store.members.find((m: any) => m.profile_id === user.id && m.status === 'active')
        if (membership) {
          orgId = membership.organization_id
          userRole = membership.role
          const org = store.organizations.find((o: any) => o.id === orgId)
          if (org) orgName = org.name
        }
      }
    }

    if (!orgId) {
      const store = loadOrgStore()
      const defaultOrg = {
        id: `org-${Date.now()}`,
        name: 'My Organization',
        plan_tier: 'standard',
        max_members: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      store.organizations.push(defaultOrg)
      store.members.push({
        id: `mem-${Date.now()}`,
        organization_id: defaultOrg.id,
        profile_id: user.id,
        role: 'admin',
        status: 'active',
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      try { fs.writeFileSync(ORG_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8') } catch { /* ignore */ }
      orgId = defaultOrg.id
      orgName = defaultOrg.name
      userRole = 'admin'
    }
  } else {
    if (!isMock) {
      try {
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', orgId)
          .single()
        if (org) orgName = org.name || ''
      } catch { /* fall through */ }
    }
    if (!orgName) {
      const store = loadOrgStore()
      const org = store.organizations.find((o: any) => o.id === orgId)
      if (org) orgName = org.name || ''
    }
  }

  // 1. Fetch Integrations
  const { data: connections } = await supabase
    .from('oauth_connections')
    .select('provider, status')
    .eq('profile_id', user.id)

  const hasIntegrations = connections && connections.length > 0
  const activeIntegrations = connections?.filter((c: any) => c.status === 'active') || []

  // 2. Fetch Outstanding Invoices — try org-scoped first
  let totalOutstandingCents = 0
  if (orgId && !isMock) {
    try {
      const { data: orgInvoices } = await supabase
        .from('invoices')
        .select('amount_due_cents')
        .eq('organization_id', orgId)
        .eq('status', 'open')
      if (orgInvoices) {
        totalOutstandingCents = orgInvoices.reduce((acc: number, inv: any) => acc + Number(inv.amount_due_cents), 0)
      }
    } catch { /* fall through */ }
  }

  // Fallback to mock org-scoped
  if (totalOutstandingCents === 0 && orgId) {
    const store = loadOrgStore()
    if (store.invoices) {
      const orgInvoices = store.invoices.filter((inv: any) => inv.organization_id === orgId && inv.status === 'open')
      totalOutstandingCents = orgInvoices.reduce((acc: number, inv: any) => acc + Number(inv.amount_due_cents || inv.amount_cents || 0), 0)
    }
  }

  // Absolute fallback: profile-scoped
  if (totalOutstandingCents === 0) {
    const { data: openInvoices } = await supabase
      .from('invoices')
      .select('amount_due_cents')
      .eq('profile_id', user.id)
      .eq('status', 'open')
    totalOutstandingCents = openInvoices?.reduce((acc: number, inv: any) => acc + Number(inv.amount_due_cents), 0) || 0
  }

  // 3. Fetch Total Recovered — org-scoped
  let totalRecoveredCents = 0
  if (orgId && isMock) {
    const store = loadOrgStore()
    if (store.recoveries) {
      const orgRecoveries = store.recoveries.filter((rec: any) => rec.organization_id === orgId)
      totalRecoveredCents = orgRecoveries.reduce((acc: number, rec: any) => acc + Number(rec.amount_recovered_cents || 0), 0)
    }
  }
  if (totalRecoveredCents === 0) {
    const { data: recoveries } = await supabase
      .from('recoveries')
      .select('amount_recovered_cents')
      .eq('profile_id', user.id)
    totalRecoveredCents = recoveries?.reduce((acc: number, rec: any) => acc + Number(rec.amount_recovered_cents), 0) || 0
  }

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

  // 5. Recent Activity
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            {orgName && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 border border-indigo-200">
                <Building2 className="h-3 w-3" />
                {orgName}
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1">
            {orgId ? 'Organization-scoped view.' : ''}
            {activeIntegrations.length > 0
              ? ` Connected to ${activeIntegrations.map((i: any) => i.provider).join(' & ')}.`
              : ' Welcome back to Reclaim AI.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SystemStatusBadge />
          {!hasIntegrations && (
            <Button asChild variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900">
              <Link href="/settings">
                <AlertCircle className="mr-2 h-4 w-4" />
                Connect Integration
              </Link>
            </Button>
          )}
        </div>
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
                            Invoice: {log.invoices?.invoice_number || 'N/A'} &bull; {log.sent_at ? format(new Date(log.sent_at), 'MMM d, h:mm a') : 'Just now'}
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
