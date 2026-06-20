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
  AlertCircle,
  Settings as SettingsIcon,
  Globe,
  Palette,
  Save
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'

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

  const [profile, setProfile] = useState({
    organization_name: '',
    logo_url: '',
    default_from_name: '',
    global_tone_preference: 'polite'
  })
  const [profileSaving, setProfileSaving] = useState(false)

  // Fetch integration statuses and profile data
  const fetchData = async () => {
    try {
      // Fetch OAuth connections
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
      }

      // Fetch Profile Data
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('organization_name, business_name, logo_url, default_from_name, global_tone_preference')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile({
            organization_name: profileData.organization_name || profileData.business_name || '',
            logo_url: profileData.logo_url || '',
            default_from_name: profileData.default_from_name || '',
            global_tone_preference: profileData.global_tone_preference || 'polite'
          })
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

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

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setNotification(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          organization_name: profile.organization_name,
          logo_url: profile.logo_url,
          default_from_name: profile.default_from_name,
          global_tone_preference: profile.global_tone_preference,
          business_name: profile.organization_name // Sync business_name as well
        })
        .eq('id', user.id)

      if (error) throw error

      setNotification({
        type: 'success',
        message: 'Branding and profile settings saved successfully.'
      })
    } catch (err: any) {
      console.error('Error saving profile:', err)
      setNotification({
        type: 'error',
        message: err.message || 'Failed to save profile settings.'
      })
    } finally {
      setProfileSaving(false)
    }
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
        {/* Branding & Profile Card */}
        <Card className="md:col-span-2 border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                <Palette className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Branding & Profile</CardTitle>
                <CardDescription>Customize how your business appears in recovery emails</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input 
                    id="org-name" 
                    value={profile.organization_name} 
                    onChange={(e) => setProfile({...profile, organization_name: e.target.value})}
                    placeholder="Your Business Name"
                  />
                  <p className="text-[11px] text-slate-500">How your business is identified in emails.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="logo-url">Logo URL</Label>
                  <Input 
                    id="logo-url" 
                    value={profile.logo_url} 
                    onChange={(e) => setProfile({...profile, logo_url: e.target.value})}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-[11px] text-slate-500">Public URL to your company logo (PNG or SVG preferred).</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="from-name">Default "From" Name</Label>
                  <Input 
                    id="from-name" 
                    value={profile.default_from_name} 
                    onChange={(e) => setProfile({...profile, default_from_name: e.target.value})}
                    placeholder="e.g. Finance Team"
                  />
                  <p className="text-[11px] text-slate-500">The sender name customers see in their inbox.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Global Tone Preference</Label>
                  <Select 
                    value={profile.global_tone_preference} 
                    onValueChange={(value) => setProfile({...profile, global_tone_preference: value})}
                  >
                    <SelectTrigger id="tone" className="w-full">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="polite">Polite & Friendly</SelectItem>
                      <SelectItem value="firm">Firm & Professional</SelectItem>
                      <SelectItem value="urgent">Urgent & Direct</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-500">Sets the base personality for AI-generated messages.</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700" 
              onClick={handleSaveProfile}
              disabled={profileSaving}
            >
              {profileSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Branding Settings
            </Button>
          </CardFooter>
        </Card>

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
