'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Globe, CheckCircle2, AlertCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { PremiumGate } from '@/components/settings/PremiumGate'

interface DomainRecord {
  type: string
  name: string
  value: string
  priority?: string
}

interface DomainData {
  id: string
  domain: string
  status: 'unverified' | 'pending' | 'verified'
  records: DomainRecord[]
  created_at: string
}

interface DomainResponse {
  domain: DomainData | null
  error?: string
}

const Label = ({ children, htmlFor, className }: any) => (
  <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
    {children}
  </label>
)

export function DomainTab() {
  const [domain, setDomain] = useState('')
  const [domainData, setDomainData] = useState<DomainData | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const domainStatus = domainData?.status || 'unverified'

  useEffect(() => {
    fetchDomain()
  }, [])

  const fetchDomain = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/domains')
      if (res.ok) {
        const data: DomainResponse = await res.json()
        if (data.domain) {
          setDomainData(data.domain)
          setDomain(data.domain.domain)
        }
      }
    } catch {
      console.error('Failed to fetch domain data')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterDomain = async () => {
    if (!domain.trim()) return
    setNotification(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', domain: domain.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to register domain')
      setDomainData(data.domain)
      setNotification({ type: 'success', message: data.message || 'Domain registered successfully!' })
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifyDomain = async () => {
    setNotification(null)
    setVerifying(true)
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', domain: domain.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setDomainData(prev => prev ? { ...prev, status: 'verified' } : null)
      setNotification({ type: 'success', message: data.message || 'Domain verified successfully!' })
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message })
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <PremiumGate feature="Custom domain verification">
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Email Domain Verification</CardTitle>
              <CardDescription>Verify your domain to send emails from your own address</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDomain} className="text-slate-600">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {notification && (
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-3 text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
            {notification.message}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="domain-input">Your Domain</Label>
              <Input
                id="domain-input"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                disabled={domainStatus === 'verified' || domainStatus === 'pending'}
              />
            </div>
            {domainStatus === 'unverified' && (
              <Button
                onClick={handleRegisterDomain}
                disabled={!domain.trim() || submitting}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Register Domain
              </Button>
            )}
            {domainStatus === 'pending' && (
              <Button
                onClick={handleVerifyDomain}
                disabled={verifying}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {verifying ? 'Checking...' : 'Verify Domain'}
              </Button>
            )}
          </div>

          {domainStatus === 'unverified' && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold">Move past Resend&apos;s trial mode</p>
                <p>By default, Reclaim AI sends emails from <strong>onboarding@resend.dev</strong>. Verify your own domain to send professional emails from your business address and reach all your customers.</p>
              </div>
            </div>
          )}

          {domainStatus === 'pending' && domainData?.records && (
            <div className="space-y-4 mt-6">
              <h4 className="font-semibold text-slate-900 text-sm">
                Add these DNS records to your domain provider for <span className="font-mono text-indigo-600">{domain}</span>:
              </h4>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-[12px] text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Name/Host</th>
                      <th className="px-4 py-2">Value/Target</th>
                      <th className="px-4 py-2">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {domainData.records.map((record, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{record.type}</td>
                        <td className="px-4 py-3 font-mono text-xs">{record.name}</td>
                        <td className="px-4 py-3 font-mono text-xs break-all max-w-[300px]">{record.value}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{record.priority || '&mdash;'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-500 italic">DNS changes can take up to 24 hours to propagate.</p>
                <Button
                  onClick={handleVerifyDomain}
                  disabled={verifying}
                  variant="outline"
                  size="sm"
                >
                  {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  I&apos;ve added these records &mdash; Verify Now
                </Button>
              </div>
            </div>
          )}

          {domainStatus === 'verified' && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-800">
                <p className="font-semibold">Domain Verified</p>
                <p>Your domain <strong>{domain}</strong> is successfully verified. Emails will now be sent from your custom address using your organization&apos;s verified domain.</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </PremiumGate>
  )
}
