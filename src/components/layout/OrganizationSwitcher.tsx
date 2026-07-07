'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Building2, Check, ChevronsUpDown } from 'lucide-react'

interface Org {
  id: string
  name: string
  logo_url?: string
  plan_tier: 'standard' | 'premium'
  role: 'admin' | 'member'
}

export function OrganizationSwitcher() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [activeOrg, setActiveOrg] = useState<Org | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch('/api/organizations')
        if (res.ok) {
          const data = await res.json()
          setOrgs(data.organizations || [])
          const savedId = sessionStorage.getItem('active_org_id')
          const urlParams = new URLSearchParams(window.location.search)
          const urlOrgId = urlParams.get('org_id')
          const effectiveId = urlOrgId || savedId
          const found = data.organizations?.find((o: Org) => o.id === effectiveId)
          setActiveOrg(found || data.organizations?.[0] || null)
        }
      } catch {
        // swallow
      } finally {
        setLoading(false)
      }
    }
    fetchOrgs()
  }, [pathname])

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const switchOrg = (org: Org) => {
    setActiveOrg(org)
    setOpen(false)
    sessionStorage.setItem('active_org_id', org.id)
    router.push(`/dashboard?org_id=${encodeURIComponent(org.id)}`)
  }

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="h-9 animate-pulse rounded-md bg-slate-700/50" />
      </div>
    )
  }

  if (orgs.length === 0) return null

  return (
    <div className="px-3 py-2 relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
          'text-slate-300 hover:bg-slate-800 hover:text-white'
        )}
      >
        <Building2 className="h-4 w-4 flex-shrink-0 text-indigo-400" />
        <span className="flex-1 truncate text-left">
          {activeOrg?.name || 'Select Organization'}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-3 right-3 z-50 mt-1 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Organizations
          </div>
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => switchOrg(org)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                activeOrg?.id === org.id
                  ? 'bg-indigo-600/20 text-indigo-300'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              )}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-700 text-xs font-bold text-slate-300">
                {org.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{org.name}</div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {org.role} &bull; {org.plan_tier}
                </div>
              </div>
              {activeOrg?.id === org.id && (
                <Check className="h-4 w-4 flex-shrink-0 text-indigo-400" />
              )}
            </button>
          ))}
          {orgs.length > 1 && activeOrg && (
            <div className="border-t border-slate-700 mt-1 pt-1">
              <div className="px-3 py-1.5 text-[10px] text-slate-500">
                Showing data for: <span className="font-semibold text-slate-300">{activeOrg.name}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
