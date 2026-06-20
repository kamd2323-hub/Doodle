'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface ConfigStatus {
  isLive: boolean
  config: {
    openai: boolean
    resend: boolean
    integration: boolean
  }
}

export function SystemStatusBadge() {
  const [status, setStatus] = useState<ConfigStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/config/status')
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
        }
      } catch (err) {
        console.error('Failed to fetch config status:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
  }

  if (!status) return null

  return (
    <div className="flex items-center gap-3">
      {status.isLive ? (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 gap-1.5 px-3 py-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          System Live
        </Badge>
      ) : (
        <Link href="/settings">
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 gap-1.5 px-3 py-1 cursor-pointer hover:bg-amber-100 transition-colors">
            <AlertCircle className="h-3.5 w-3.5" />
            Setup Required
          </Badge>
        </Link>
      )}
      
      {!status.isLive && (
        <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500">
          <span className={status.config.integration ? 'text-emerald-600' : 'text-slate-400'}>• Integration</span>
          <span className={status.config.openai ? 'text-emerald-600' : 'text-slate-400'}>• AI</span>
          <span className={status.config.resend ? 'text-emerald-600' : 'text-slate-400'}>• Email</span>
        </div>
      )}
    </div>
  )
}
