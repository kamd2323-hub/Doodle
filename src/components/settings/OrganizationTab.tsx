'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Building2,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Palette,
  Globe,
  Mail,
  CreditCard,
  Users,
  ChevronRight,
  Shield,
  Palette as PaletteIcon,
  Rocket,
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  slug: string
  plan_tier: 'standard' | 'premium'
  max_members: number
  billing_email?: string
  custom_domain?: string
  logo_url?: string
  primary_color?: string
  from_name?: string
  from_email?: string
}

interface OrgResponse {
  organization: Organization
  role: 'admin' | 'member'
  memberCount: number
  maxMembers: number
}

const Label = ({ children, htmlFor, className }: any) => (
  <label htmlFor={htmlFor} className={`text-sm font-medium text-slate-700 ${className}`}>
    {children}
  </label>
)

export function OrganizationTab() {
  const [org, setOrg] = useState<Organization | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [role, setRole] = useState<'admin' | 'member' | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [orgName, setOrgName] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [logoUrl, setLogoUrl] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState('')

  const fetchOrg = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/organization')
      if (!res.ok) throw new Error('Failed to fetch organization data')
      const data: OrgResponse = await res.json()
      const orgData = data.organization
      setOrg(orgData)
      setMemberCount(data.memberCount)
      setRole(data.role)

      // Populate form
      setOrgName(orgData.name || '')
      setBillingEmail(orgData.billing_email || '')
      setCustomDomain(orgData.custom_domain || '')
      setPrimaryColor(orgData.primary_color || '#6366f1')
      setLogoUrl(orgData.logo_url || '')
      setFromName(orgData.from_name || '')
      setFromEmail(orgData.from_email || '')
    } catch (err: any) {
      setError(err.message || 'Failed to load organization settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrg()
  }, [fetchOrg])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          billing_email: billingEmail,
          custom_domain: customDomain,
          primary_color: primaryColor,
          logo_url: logoUrl,
          from_name: fromName,
          from_email: fromEmail,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save settings')
      }
      setSuccess('Organization settings saved successfully.')
      setTimeout(() => setSuccess(null), 4000)
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const isAdmin = role === 'admin'

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-4 animate-pulse">
            <div className="h-5 bg-slate-200 rounded w-1/3" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-5 bg-slate-200 rounded w-1/4" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-5 bg-slate-200 rounded w-1/4" />
            <div className="h-10 bg-slate-100 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-700">{success}</div>
        </div>
      )}

      {!isAdmin && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">Read-only view</p>
            <p>Only admins can modify organization settings. Contact your admin for changes.</p>
          </div>
        </div>
      )}

      {/* Organization Name */}
      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Organization Details</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Your Company Name"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-email">Billing Email</Label>
              <Input
                id="billing-email"
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="billing@company.com"
                disabled={!isAdmin}
              />
              <p className="text-[11px] text-slate-500">Invoices and receipts will be sent here.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* White-Labeling Section */}
      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <PaletteIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">White-Labeling</CardTitle>
              <p className="text-sm text-slate-500 mt-0.5">
                {org?.plan_tier === 'premium' ? 'Customize your brand in recovery emails' : 'Premium feature — upgrade to unlock'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {org?.plan_tier !== 'premium' ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <Rocket className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Upgrade to Premium for White-Labeling</p>
              <p className="text-xs text-slate-500 mt-1">
                Custom domain, logo, brand colors, and custom sender details.
              </p>
              <Button variant="outline" className="mt-3" size="sm">
                Upgrade to Premium
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="custom-domain">Custom Domain</Label>
                  <Input
                    id="custom-domain"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="emails.yourcompany.com"
                    disabled={!isAdmin}
                  />
                  <p className="text-[11px] text-slate-500">Verified email sending domain.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Brand Color</Label>
                  <div className="flex gap-2">
                    <input
                      id="primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer disabled:opacity-50"
                      disabled={!isAdmin}
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#6366f1"
                      disabled={!isAdmin}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo-url">Logo URL</Label>
                <Input
                  id="logo-url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  disabled={!isAdmin}
                />
                <p className="text-[11px] text-slate-500">Public URL to your company logo (PNG or SVG).</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="from-name">Sender Name</Label>
                  <Input
                    id="from-name"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Finance Team"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-email">Sender Email</Label>
                  <Input
                    id="from-email"
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="finance@yourcompany.com"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan & Billing Card */}
      <Card>
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Plan & Billing</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900">
                  {org?.plan_tier === 'premium' ? 'Premium' : 'Standard'}
                </span>
                <Badge className={org?.plan_tier === 'premium'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
                }>
                  {org?.plan_tier === 'premium' ? '$79/mo' : 'Free'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {memberCount} of {org?.max_members || 1} members
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {org?.plan_tier === 'premium' ? 'White-label enabled' : 'Standard branding'}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              onClick={() => {} /* Future: Stripe Customer Portal */}
            >
              Manage Subscription
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              <p>Organization Slug: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{org?.slug || '—'}</code></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}