'use client'

import { cn } from '@/lib/utils'
import {
  PlugZap,
  Palette,
  Globe,
  Users,
  Building2,
  ChevronDown,
  CreditCard,
} from 'lucide-react'

export interface TabDef {
  id: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

export const SETTINGS_TABS: TabDef[] = [
  { id: 'integrations', label: 'Integrations', icon: PlugZap },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'domain', label: 'Domain', icon: Globe },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard, adminOnly: true },
  { id: 'organization', label: 'Organization', icon: Building2, adminOnly: true },
]

interface SettingsTabsProps {
  activeTab: string
  onTabChange: (tabId: string) => void
  role: 'admin' | 'member' | null
}

export function SettingsTabs({ activeTab, onTabChange, role }: SettingsTabsProps) {
  return (
    <>
      {/* Mobile: Dropdown */}
      <div className="md:hidden">
        <select
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {SETTINGS_TABS
            .filter((t) => !t.adminOnly || role === 'admin')
            .map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
        </select>
      </div>

      {/* Desktop: Vertical tabs */}
      <nav className="hidden md:flex flex-col space-y-1 w-56 shrink-0" aria-label="Settings tabs">
        {SETTINGS_TABS.map((tab) => {
          if (tab.adminOnly && role !== 'admin') return null
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              )}
            >
              <tab.icon className={cn(
                'h-4 w-4 flex-shrink-0',
                isActive ? 'text-indigo-600' : 'text-slate-400'
              )} />
              <span>{tab.label}</span>
              {tab.adminOnly && (
                <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </>
  )
}