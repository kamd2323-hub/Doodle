'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  CreditCard, 
  Building2, 
  Link2, 
  Unlink 
} from 'lucide-react'

interface IntegrationStatus {
  connected: boolean
  name: string
}

interface StatusResponse {
  integrations: {
    stripe: IntegrationStatus
    quickbooks: IntegrationStatus
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Fetch current integrations status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/auth/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Error fetching integrations status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    // Handle redirect alerts/notifications from URL parameters
    const integration = searchParams.get('integration')
    const statusParam = searchParams.get('status')

    if (statusParam === 'success' && integration) {
      const name = integration === 'stripe' ? 'Stripe' : 'QuickBooks Online'
      setNotification({
        type: 'success',
        message: `Successfully connected to ${name}! Your invoices are now syncing.`,
      })
      
      // Clean up URL parameters to avoid repeating alerts on reload
      router.replace('/settings')
    }
  }, [searchParams, router])

  const handleConnect = (provider: 'stripe' | 'quickbooks') => {
    setActionLoading(provider)
    // Redirect to redirect endpoint
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
          message: data.message || `Disconnected ${provider === 'stripe' ? 'Stripe' : 'QuickBooks'}.`,
        })
        await fetchStatus()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-lg font-medium text-slate-600">Loading settings...</span>
      </div>
    )
  }

  const stripe = status?.integrations.stripe
  const quickbooks = status?.integrations.quickbooks

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings & Integrations</h1>
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
              <Badge variant={stripe?.connected ? 'default' : 'secondary'} className={stripe?.connected ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}>
                {stripe?.connected ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-grow pb-6">
            <p className="text-sm text-slate-500 leading-relaxed">
              Connect your Stripe account to automatically import outstanding invoices, map customers, monitor payment events, and initiate smart dunning recovery runs.
            </p>
          </CardContent>
          <CardFooter className="pt-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center justify-end">
            {stripe?.connected ? (
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
              <Badge variant={quickbooks?.connected ? 'default' : 'secondary'} className={quickbooks?.connected ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}>
                {quickbooks?.connected ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-grow pb-6">
            <p className="text-sm text-slate-500 leading-relaxed">
              Integrate with QuickBooks Online to pull invoices, track customers, update transaction statuses, and automate reminders using your custom email sequences.
            </p>
          </CardContent>
          <CardFooter className="pt-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center justify-end">
            {quickbooks?.connected ? (
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
import { useState, useEffect } from 'react'
import { useSupabase } from '@/hooks/use-supabase'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

interface OAuthConnection {
  provider: string
  status: string
  tenant_name?: string
}

export default function SettingsPage() {
  const [connections, setConnections] = useState<OAuthConnection[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useSupabase()

  useEffect(() => {
    async function fetchConnections() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('oauth_connections')
          .select('provider, status, tenant_name')
          .eq('profile_id', user.id)

        if (!error && data) {
          setConnections(data)
        }
      }
      setLoading(false)
    }

    fetchConnections()
  }, [supabase])

  const getConnectionStatus = (provider: string) => {
    const conn = connections.find(c => c.provider === provider)
    return conn ? conn.status : 'disconnected'
  }

  const getTenantName = (provider: string) => {
    const conn = connections.find(c => c.provider === provider)
    return conn?.tenant_name
  }

  const providers = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Connect your Stripe account to sync invoices and track payments.',
      authUrl: '/api/auth/stripe',
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Connect your QuickBooks account to sync your business invoices.',
      authUrl: '/api/auth/qbo',
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your account and service integrations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {providers.map((provider) => {
          const status = getConnectionStatus(provider.id)
          const tenantName = getTenantName(provider.id)
          const isConnected = status === 'active'

          return (
            <Card key={provider.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{provider.name}</CardTitle>
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  ) : isConnected ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
                      <XCircle className="mr-1 h-3 w-3" /> Disconnected
                    </Badge>
                  )}
                </div>
                <CardDescription>{provider.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {isConnected && tenantName && (
                  <div className="mt-2 text-sm text-slate-600">
                    <span className="font-medium">Connected Account:</span> {tenantName}
                  </div>
                )}
                {status === 'error' && (
                  <div className="mt-2 flex items-center text-sm text-red-600">
                    <AlertCircle className="mr-1 h-4 w-4" />
                    Connection error. Please try reconnecting.
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50 px-6 py-4">
                <Button 
                  asChild 
                  className="w-full"
                  variant={isConnected ? "outline" : "default"}
                >
                  <a href={provider.authUrl}>
                    {isConnected ? 'Reconnect' : `Connect to ${provider.name}`}
                  </a>
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
