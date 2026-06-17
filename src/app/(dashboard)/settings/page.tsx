'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSupabase } from '@/hooks/use-supabase'
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  CreditCard, 
  Building2, 
  Link2, 
  Unlink,
  AlertCircle
} from 'lucide-react'

interface ConnectionDetails {
  connected: boolean
  name: string
  tenantName?: string
}

interface StatusResponse {
  integrations: {
    stripe: ConnectionDetails
    quickbooks: ConnectionDetails
  }
}

interface OAuthConnection {
  provider: string
  status: string
  tenant_name?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useSupabase()
  
  const [connections, setConnections] = useState<OAuthConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Fetch integration statuses from our internal API
  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/auth/status')
      if (res.ok) {
        const statusData: StatusResponse = await res.json()
        const newConnections: OAuthConnection[] = []
        
        if (statusData.integrations.stripe.connected) {
          newConnections.push({
            provider: 'stripe',
            status: 'active',
            tenant_name: statusData.integrations.stripe.tenantName || 'Stripe Account'
          })
        }
        
        if (statusData.integrations.quickbooks.connected) {
          newConnections.push({
            provider: 'quickbooks',
            status: 'active',
            tenant_name: statusData.integrations.quickbooks.tenantName || 'QuickBooks Company'
          })
        }
        
        setConnections(newConnections)
      } else {
        console.error('Failed to fetch connection status')
      }
    } catch (err) {
      console.error('Error fetching connections:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()

    // Handle redirect alerts/notifications from URL parameters
    const integration = searchParams.get('integration')
    const statusParam = searchParams.get('status')
    const errorParam = searchParams.get('error')

    if (statusParam === 'success' && integration) {
      const name = integration === 'stripe' ? 'Stripe' : 'QuickBooks Online'
      setNotification({
        type: 'success',
        message: `Successfully connected to ${name}! Your invoices are now syncing.`,
      })
      router.replace('/settings')
    } else if (statusParam === 'error' || errorParam) {
      setNotification({
        type: 'error',
        message: errorParam || 'Failed to complete connection. Please try again.',
      })
      router.replace('/settings')
    }
  }, [searchParams, router])

  const handleConnect = (provider: 'stripe' | 'quickbooks') => {
    setActionLoading(provider)
    // Redirect to the connect endpoint
    window.location.href = `/api/auth/${provider}/connect`
  }

  const handleDisconnect = async (provider: 'stripe' | 'quickbooks') => {
    setActionLoading(provider)
    setNotification(null)
    try {
      const res = await fetch(`/api/auth/disconnect?provider=${provider}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setNotification({
          type: 'success',
          message: data.message || `Disconnected ${provider === 'stripe' ? 'Stripe' : 'QuickBooks Online'}.`,
        })
        await fetchConnections()
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to disconnect integration',
        })
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Network error. Please try again.',
      })
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-lg font-medium text-slate-600">Loading settings...</span>
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
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings & Integrations</h1>
        <p className="text-slate-500">
          Manage your account connections, invoicing sources, and dunning integrations.
        </p>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 border ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-medium">{notification.message}</div>
        </div>
      )}

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
            {stripeStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Connection error. Please try reconnecting.
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center justify-end">
            {stripeConnected ? (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                disabled={actionLoading !== null}
                onClick={() => handleDisconnect('stripe')}
              >
                {actionLoading === 'stripe' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="mr-2 h-4 w-4" />
                )}
                Disconnect Stripe
              </Button>
            ) : (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={actionLoading !== null}
                onClick={() => handleConnect('stripe')}
              >
                {actionLoading === 'stripe' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                Connect Stripe
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* QuickBooks Online Card */}
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
            {qboStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Connection error. Please try reconnecting.
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center justify-end">
            {qboConnected ? (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                disabled={actionLoading !== null}
                onClick={() => handleDisconnect('quickbooks')}
              >
                {actionLoading === 'quickbooks' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="mr-2 h-4 w-4" />
                )}
                Disconnect QuickBooks
              </Button>
            ) : (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 hover:text-white text-white border-none"
                disabled={actionLoading !== null}
                onClick={() => handleConnect('quickbooks')}
              >
                {actionLoading === 'quickbooks' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                Connect QuickBooks
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
