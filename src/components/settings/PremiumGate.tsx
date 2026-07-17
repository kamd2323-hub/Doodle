'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Lock, Rocket } from 'lucide-react'

interface PremiumGateProps {
  /** Feature name to display in the lock message */
  feature: string
  /** What plan tier is required (default: 'premium') */
  requiredTier?: 'premium'
  /** Children to render when the gate passes */
  children: ReactNode
  /** Optional fallback content override */
  fallback?: ReactNode
}

/**
 * PremiumGate — Wraps UI elements that should be restricted to Premium users.
 * Fetches the org's plan tier and shows a locked state if not Premium.
 */
export function PremiumGate({ feature, requiredTier = 'premium', children, fallback }: PremiumGateProps) {
  const [org, setOrg] = useState<{ plan_tier: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch('/api/organization')
        if (res.ok) {
          const data = await res.json()
          if (data.organization) {
            setOrg(data.organization)
          }
        }
      } catch {
        // Fall through
      } finally {
        setLoading(false)
      }
    }
    fetchOrg()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    )
  }

  const isPremium = org?.plan_tier === requiredTier

  if (isPremium) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <Card className="border-slate-200 bg-slate-50/50">
      <CardContent className="py-8">
        <div className="flex flex-col items-center text-center max-w-sm mx-auto">
          <div className="p-3 bg-slate-100 rounded-full mb-4">
            <Lock className="h-6 w-6 text-slate-400" />
          </div>
          <CardTitle className="text-lg font-semibold text-slate-700 mb-1">
            Premium Feature
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 mb-4">
            {feature} is available on the Premium plan. Upgrade to unlock this and more.
          </CardDescription>
          <Button
            onClick={() => window.location.href = '/settings?tab=billing'}
            className="bg-indigo-600 hover:bg-indigo-700"
            size="sm"
          >
            <Rocket className="h-4 w-4 mr-1" />
            Upgrade to Premium
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}