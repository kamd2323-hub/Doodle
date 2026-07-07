'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSupabase } from '@/hooks/use-supabase'
import { Globe, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

const Label = ({ children, htmlFor, className }: any) => (
  <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
    {children}
  </label>
)

export function DomainTab() {
  const supabase = useSupabase()
  const [domain, setDomain] = useState('')
  const [domainStatus, setDomainStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified')
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDomain = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('verified_domain, domain_status')
            .eq('id', user.id)
            .single()
          if (profileData) {
            setDomain(profileData.verified_domain || '')
            setDomainStatus(profileData.domain_status || 'unverified')
          }
        }
      } catch (err) {
        console.error('Error fetching domain:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDomain()
  }, [supabase])

  const handleVerifyDomain = async () => {
    if (!domain) return
    setNotification(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({ verified_domain: domain, domain_status: 'pending' })
        .eq('id', user.id)

      if (error) throw error
      
      setDomainStatus('pending')
      setNotification({ type: 'success', message: 'Domain verification requested. Please add the DNS records below to your domain provider.' })
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to request domain verification.' })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="h-5 bg-slate-200 rounded w-1/3 animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Email Domain Verification</CardTitle>
            <CardDescription>Verify your domain to send emails from your own address</CardDescription>
          </div>
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
                disabled={domainStatus === 'verified'}
              />
            </div>
            <Button 
              onClick={handleVerifyDomain} 
              disabled={!domain || domainStatus === 'verified' || domainStatus === 'pending'}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {domainStatus === 'pending' ? 'Verification Pending' : domainStatus === 'verified' ? 'Verified' : 'Verify Domain'}
            </Button>
          </div>

          {domainStatus === 'unverified' && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold">Move past Resend's trial mode</p>
                <p>By default, Reclaim AI sends emails from <strong>onboarding@resend.dev</strong>. Verify your own domain to send professional emails from your business address and reach all your customers.</p>
              </div>
            </div>
          )}

          {domainStatus === 'pending' && (
            <div className="space-y-4 mt-6">
              <h4 className="font-semibold text-slate-900 text-sm">Add these DNS records to your domain provider:</h4>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-[12px] text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-3 font-mono">TXT</td>
                      <td className="px-4 py-3 font-mono">resend-verification</td>
                      <td className="px-4 py-3 font-mono text-xs">v=resend-v1:7015c8a...</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono">MX</td>
                      <td className="px-4 py-3 font-mono">feedback</td>
                      <td className="px-4 py-3 font-mono text-xs">feedback-smtp.us-east-1.amazonses.com</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-500 italic">DNS changes can take up to 24 hours to propagate.</p>
            </div>
          )}

          {domainStatus === 'verified' && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-800">
                <p className="font-semibold">Domain Verified</p>
                <p>Your domain <strong>{domain}</strong> is successfully verified. Emails will now be sent from your custom address.</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}