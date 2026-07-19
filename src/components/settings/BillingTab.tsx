'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSearchParams } from 'next/navigation'
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  XCircle,
  Rocket,
  Star,
  Zap,
  ExternalLink,
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  slug: string
  plan_tier: 'standard' | 'premium'
  max_members: number
  billing_email?: string
  stripe_customer_id?: string
}

interface PlanFeature {
  label: string
  included: boolean
  premium: boolean
}

const STANDARD_FEATURES: PlanFeature[] = [
  { label: 'Up to 3 team members', included: true, premium: false },
  { label: 'Basic dunning sequences', included: true, premium: false },
  { label: 'Email notifications', included: true, premium: false },
  { label: 'Dashboard analytics', included: true, premium: false },
  { label: 'Custom email branding', included: false, premium: true },
  { label: 'Custom domain verification', included: false, premium: true },
  { label: 'Unlimited team members', included: false, premium: true },
  { label: 'White-label experience', included: false, premium: true },
  { label: 'Advanced reporting', included: false, premium: true },
  { label: 'Priority support', included: false, premium: true },
]

export function BillingTab() {
  const searchParams = useSearchParams()
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const checkoutSuccess = searchParams.get('checkout') === 'success'
  const checkoutCancelled = searchParams.get('checkout') === 'cancelled'
  const checkoutPlan = searchParams.get('plan')

  useEffect(() => {
    if (checkoutSuccess) {
      setNotification({
        type: 'success',
        message: checkoutPlan === 'premium'
          ? 'Welcome to Premium! Your subscription is active.'
          : 'Your Standard subscription is now active!',
      })
    } else if (checkoutCancelled) {
      setNotification({
        type: 'error',
        message: 'Checkout was cancelled. No charges were made.',
      })
    }
  }, [checkoutSuccess, checkoutCancelled, checkoutPlan])

  useEffect(() => {
    const fetchOrg = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/organization')
        if (res.ok) {
          const data = await res.json()
          setOrg(data.organization || null)
        }
      } catch {
        console.error('Failed to fetch organization')
      } finally {
        setLoading(false)
      }
    }
    fetchOrg()
  }, [])

  const handleSubscribe = async (plan: string) => {
    setSubscribing(plan)
    setNotification(null)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout session')
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message })
      setSubscribing(null)
    }
  }

  const handleManageBilling = () => {
    // In production, redirect to Stripe Customer Portal
    // For now, open the Stripe customer portal or show a message
    setNotification({ type: 'success', message: 'Billing management portal coming soon. Contact support for changes.' })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-sm text-slate-500">Loading billing info...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentPlan = org?.plan_tier || 'standard'
  const isPremium = currentPlan === 'premium'

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`p-4 rounded-lg flex items-start gap-3 text-sm border ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
          <div>{notification.message}</div>
        </div>
      )}

      {/* Current Plan Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className={`border-b ${isPremium ? 'bg-gradient-to-r from-indigo-50 to-purple-50' : 'bg-slate-50/50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isPremium ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Subscription & Billing</CardTitle>
                <CardDescription>Manage your plan and payment details</CardDescription>
              </div>
            </div>
            <Badge className={isPremium
              ? 'bg-indigo-100 text-indigo-700 border-indigo-200 text-xs px-3 py-1'
              : 'bg-slate-100 text-slate-600 border-slate-200 text-xs px-3 py-1'
            }>
              {isPremium ? 'Premium' : 'Standard'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-slate-500">
                {isPremium
                  ? 'You\'re on the Premium plan — all features unlocked.'
                  : 'You\'re on the Standard plan. Upgrade to unlock premium features.'}
              </p>
              {org?.billing_email && (
                <p className="text-xs text-slate-400">
                  Billing email: <span className="font-mono">{org.billing_email}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {isPremium ? (
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  className="text-indigo-600 border-indigo-200"
                >
                  Manage Billing
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubscribe('premium')}
                  disabled={subscribing === 'premium'}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {subscribing === 'premium' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Rocket className="h-4 w-4 mr-1" />}
                  {subscribing === 'premium' ? 'Processing...' : 'Upgrade to Premium'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Standard Plan */}
        <Card className={`border-2 ${!isPremium ? 'border-indigo-300 shadow-md' : 'border-slate-200'} shadow-sm`}>
          <CardHeader className={`border-b ${!isPremium ? 'bg-indigo-50/50' : 'bg-slate-50/50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-slate-600" />
                <CardTitle className="text-lg font-bold">Standard</CardTitle>
              </div>
              {!isPremium && (
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">Current</Badge>
              )}
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold text-slate-900">$29</span>
              <span className="text-sm text-slate-500 ml-1">/month</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Perfect for freelancers and small teams</p>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-3">
              {STANDARD_FEATURES.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {feature.included ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-slate-300 mt-0.5 flex-shrink-0" />
                  )}
                  <span className={feature.included ? 'text-slate-700' : 'text-slate-400 line-through'}>
                    {feature.label}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {isPremium ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => handleSubscribe('standard')}
                  disabled={subscribing === 'standard'}
                >
                  {subscribing === 'standard' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {subscribing === 'standard' ? 'Processing...' : 'Stay on Standard'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className={`border-2 ${isPremium ? 'border-indigo-300 shadow-md' : 'border-slate-200'} shadow-sm relative`}>
          {!isPremium && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-indigo-600 text-white border-0 text-xs px-4 py-1">
                <Zap className="h-3 w-3 mr-1" /> Recommended
              </Badge>
            </div>
          )}
          <CardHeader className={`border-b ${isPremium ? 'bg-indigo-50/50' : 'bg-slate-50/50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg font-bold">Premium</CardTitle>
              </div>
              {isPremium && (
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">Current</Badge>
              )}
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold text-slate-900">$79</span>
              <span className="text-sm text-slate-500 ml-1">/month</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">For growing teams that need full control</p>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-3">
              {STANDARD_FEATURES.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${feature.premium ? 'text-indigo-500' : 'text-emerald-500'}`} />
                  <span className="text-slate-700">{feature.label}</span>
                  {feature.premium && (
                    <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 text-[10px] ml-auto">Premium</Badge>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {isPremium ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => handleSubscribe('premium')}
                  disabled={subscribing === 'premium'}
                >
                  {subscribing === 'premium' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Rocket className="h-4 w-4 mr-1" />}
                  {subscribing === 'premium' ? 'Processing...' : 'Upgrade to Premium'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Summary */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Plan Features</CardTitle>
              <CardDescription>What each plan includes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-700">Standard</th>
                  <th className="text-center py-3 px-4 font-semibold text-indigo-700 bg-indigo-50/50 rounded-t-lg">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 text-slate-600">Price</td>
                  <td className="py-3 px-4 text-center font-semibold">$29/mo</td>
                  <td className="py-3 px-4 text-center font-semibold text-indigo-700 bg-indigo-50/30">$79/mo</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-600">Team Members</td>
                  <td className="py-3 px-4 text-center">Up to 3</td>
                  <td className="py-3 px-4 text-center bg-indigo-50/30">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-600">Dunning Sequences</td>
                  <td className="py-3 px-4 text-center">✓</td>
                  <td className="py-3 px-4 text-center bg-indigo-50/30">✓ Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-600">Custom Email Branding</td>
                  <td className="py-3 px-4 text-center text-slate-300">—</td>
                  <td className="py-3 px-4 text-center bg-indigo-50/30">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-600">Custom Domain</td>
                  <td className="py-3 px-4 text-center text-slate-300">—</td>
                  <td className="py-3 px-4 text-center bg-indigo-50/30">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-600">White-Labeling</td>
                  <td className="py-3 px-4 text-center text-slate-300">—</td>
                  <td className="py-3 px-4 text-center bg-indigo-50/30">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-600">Advanced Reporting</td>
                  <td className="py-3 px-4 text-center text-slate-300">—</td>
                  <td className="py-3 px-4 text-center bg-indigo-50/30">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-600">Priority Support</td>
                  <td className="py-3 px-4 text-center text-slate-300">—</td>
                  <td className="py-3 px-4 text-center bg-indigo-50/30">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}