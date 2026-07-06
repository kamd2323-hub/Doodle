'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSupabase } from '@/hooks/use-supabase'
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  CreditCard,
  Building2,
  Link2,
  Unlink,
  AlertCircle,
} from 'lucide-react'

interface OAuthConnection {
  provider: string
  status: string
  tenant_name?: string
}

export function IntegrationsTab() {
  const supabase = useSupabase()
  const [connections, setConnections] = useState<OAuthConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [configStatus, setConfigStatus] = useState<{ openai: boolean; resend: boolean } | null>(null)

  const fetchData = async () => {
    try {
      const configRes = await fetch('/api/config/status')
      if (configRes.ok) {
        const configData = await configRes.json()
        setConfigStatus(configData.config)
      }

      const res = await fetch('/api/auth/status')
      if (res.ok) {
        const statusData = await res.json()
        const newConnections: OAuthConnection[] = []
        
        if (statusData.integrations?.stripe?.connected) {
          newConnections.push({
            provider: 'stripe',
            status: 'active',
            tenant_name: statusData.integrations.stripe.tenantName || 'Stripe Account'
          })
        }
        if (statusData.integrations?.quickbooks?.connected) {
          newConnections.push({
            provider: 'quickbooks',
            status: 'active',
            tenant_name: statusData.integrations.quickbooks.tenantName || 'QuickBooks Company'
          })
        }
        setConnections(newConnections)
      }
    } catch (err) {
      console.error('Error fetching integrations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleConnect = (provider: 'stripe' | 'quickbooks') => {
    setActionLoading(provider)
    window.location.href = `/api/auth/${provider}/connect`
  }

  const handleDisconnect = async (provider: 'stripe' | 'quickbooks') => {
    setActionLoading(provider)
    try {
      await fetch(`/api/auth/disconnect?provider=${provider}`, { method: 'DELETE' })
      await fetchData()
    } catch (err) {
      console.error('Error disconnecting:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const getConnectionStatus = (provider: string) => {
    const conn = connections.find(c => c.provider === provider)
    return conn ? conn.status : 'disconnected'
  }

  const getTenantName = (provider: string) => {
    const conn = connections.find(c => c.provider === provider)
    return conn?.tenant_name
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    )
  }

  const stripeStatus = getConnectionStatus('stripe')
  const stripeConnected = stripeStatus === 'active'
  const stripeTenant = getTenantName('stripe')
  const qboStatus = getConnectionStatus('quickbooks')
  const qboConnected = qboStatus === 'active'
  const qboTenant = getTenantName('quickbooks')

  return (
    <div className="space-y-6">
      {/* Recovery Engine Status */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Recovery Engine Status</CardTitle>
              <CardDescription>Check the readiness of your AI and Communication services</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-4 bg-white border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${configStatus?.openai ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="font-medium text-slate-900">OpenAI API</span>
              </div>
              <Badge variant={configStatus?.openai ? 'default' : 'secondary'}>
                {configStatus?.openai ? 'Verified' : 'Not Set'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-white border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${configStatus?.resend ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="font-medium text-slate-900">Resend API</span>
              </div>
              <Badge variant={configStatus?.resend ? 'default' : 'secondary'}>
                {configStatus?.resend ? 'Verified' : 'Not Set'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-white border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${stripeConnected || qboConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="font-medium text-slate-900">Active Data Link</span>
              </div>
              <Badge variant={stripeConnected || qboConnected ? 'default' : 'secondary'}>
                {stripeConnected || qboConnected ? 'Connected' : 'Missing'}
              </Badge>
            </div>
          </div>
          {!configStatus?.openai || !configStatus?.resend ? (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Setup Required for Recovery</p>
                <p>Your recovery engine is currently in "Setup Mode". Please provide your OpenAI and Resend API keys in the environment configuration to enable AI-powered recovery.</p>
              </div>
            </div>
          ) : (stripeConnected || qboConnected) && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-800">
                <p className="font-semibold">System is Live</p>
                <p>Your recovery engine is fully configured and ready to process outstanding invoices automatically.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stripe Card */}
        <Card className="flex flex-col h-full border border-slate-200 hover:border-slate-300 transition-colors shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Stripe Connect</CardTitle>
                  <CardDescription>Sync Stripe invoices & charges</CardDescription>
                </div>
              </div>
              <Badge variant={stripeConnected ? 'default' : 'secondary'} className={stripeConnected ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}>
                {stripeConnected ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-grow pb-6 space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              Connect your Stripe account to automatically import outstanding invoices, map customers, monitor payment events, and initiate smart dunning recovery runs.
            </p>
            {stripeConnected && stripeTenant && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                <span className="font-semibold text-slate-700">Connected Account:</span>{' '}
                <span className="text-slate-600 font-medium">{stripeTenant}</span>
              </div>
            )}
          </CardContent>
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center justify-end">
            {stripeConnected ? (
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={actionLoading !== null} onClick={() => handleDisconnect('stripe')}>
                {actionLoading === 'stripe' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                Disconnect
              </Button>
            ) : (
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={actionLoading !== null} onClick={() => handleConnect('stripe')}>
                {actionLoading === 'stripe' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                Connect Stripe
              </Button>
            )}
          </div>
        </Card>

        {/* QuickBooks Card */}
        <Card className="flex flex-col h-full border border-slate-200 hover:border-slate-300 transition-colors shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">QuickBooks Online</CardTitle>
                  <CardDescription>Sync QuickBooks invoices & customers</CardDescription>
                </div>
              </div>
              <Badge variant={qboConnected ? 'default' : 'secondary'} className={qboConnected ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}>
                {qboConnected ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-grow pb-6 space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              Integrate with QuickBooks Online to pull invoices, track customers, update transaction statuses, and automate reminders using your custom email sequences.
            </p>
            {qboConnected && qboTenant && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                <span className="font-semibold text-slate-700">Connected Company:</span>{' '}
                <span className="text-slate-600 font-medium">{qboTenant}</span>
              </div>
            )}
          </CardContent>
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center justify-end">
            {qboConnected ? (
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={actionLoading !== null} onClick={() => handleDisconnect('quickbooks')}>
                {actionLoading === 'quickbooks' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                Disconnect
              </Button>
            ) : (
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actionLoading !== null} onClick={() => handleConnect('quickbooks')}>
                {actionLoading === 'quickbooks' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                Connect QuickBooks
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}