'use client'

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
