'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { SettingsTabs, SETTINGS_TABS } from '@/components/settings/SettingsTabs'
import { IntegrationsTab } from '@/components/settings/IntegrationsTab'
import { BrandingTab } from '@/components/settings/BrandingTab'
import { DomainTab } from '@/components/settings/DomainTab'
import { TeamTab } from '@/components/settings/TeamTab'
import { OrganizationTab } from '@/components/settings/OrganizationTab'

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [role, setRole] = useState<'admin' | 'member' | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)

  const tabFromUrl = searchParams.get('tab') || 'integrations'
  const validTabIds = SETTINGS_TABS.map(t => t.id)

  // Resolve effective tab (handle invalid/mis-gated tabs)
  let activeTab = validTabIds.includes(tabFromUrl) ? tabFromUrl : 'integrations'

  // If the active tab is org and user is not admin, fallback to integrations
  if (activeTab === 'organization' && role !== 'admin') {
    activeTab = 'integrations'
  }

  // Resolve user role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch('/api/organization')
        if (res.ok) {
          const data = await res.json()
          setRole(data.role || 'member')
        } else {
          setRole('member')
        }
      } catch {
        setRole('member')
      } finally {
        setLoadingRole(false)
      }
    }
    fetchRole()
  }, [])

  const handleTabChange = useCallback((tabId: string) => {
    router.push(`/settings?tab=${tabId}`, { scroll: false })
  }, [router])

  // Sync URL if the current tab is invalid for the resolved role
  useEffect(() => {
    if (!loadingRole && role !== null) {
      const effectiveTab = validTabIds.includes(tabFromUrl) ? tabFromUrl : 'integrations'
      const finalTab = (effectiveTab === 'organization' && role !== 'admin') ? 'integrations' : effectiveTab
      if (finalTab !== tabFromUrl) {
        router.replace(`/settings?tab=${finalTab}`, { scroll: false })
      }
    }
  }, [loadingRole, role, tabFromUrl, router, validTabIds])

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'integrations':
        return <IntegrationsTab />
      case 'branding':
        return <BrandingTab />
      case 'domain':
        return <DomainTab />
      case 'team':
        return <TeamTab />
      case 'organization':
        return role === 'admin' ? <OrganizationTab /> : <IntegrationsTab />
      default:
        return <IntegrationsTab />
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500">
          Manage your integrations, branding, team, and organization settings.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab Navigation */}
        <SettingsTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          role={role}
        />

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}