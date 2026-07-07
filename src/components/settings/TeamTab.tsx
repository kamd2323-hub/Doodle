'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MemberAvatar } from '@/components/settings/MemberAvatar'
import { InviteMemberDialog } from '@/components/settings/InviteMemberDialog'
import { ConfirmActionDialog } from '@/components/settings/ConfirmActionDialog'
import {
  Users,
  UserPlus,
  Mail,
  MoreHorizontal,
  Shield,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Rocket,
  RefreshCw,
  XCircle,
  CheckCircle2,
} from 'lucide-react'

interface TeamMember {
  id: string
  profile_id?: string
  profile_name?: string
  profile_email?: string
  role: 'admin' | 'member'
  status: 'active' | 'invited'
  created_at?: string
  email?: string
}

interface OrgData {
  organization: {
    id: string
    name: string
    plan_tier: 'standard' | 'premium'
    max_members: number
  }
  role: 'admin' | 'member'
  memberCount: number
  maxMembers: number
}

export function TeamTab() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [orgData, setOrgData] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null)

  // Dialog states
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'role' | 'revoke'
    member: TeamMember
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null)
      }
    }
    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdownId])

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/team/members')
      if (!res.ok) throw new Error('Failed to fetch team data')
      const data = await res.json()

      const mappedMembers: TeamMember[] = (data.members || []).map((m: any) => ({
        id: m.id,
        profile_id: m.profile_id,
        profile_name: m.profile_name || '',
        profile_email: m.profile_email || m.email || '',
        role: m.role,
        status: m.status || 'active',
        created_at: m.created_at || m.invited_at,
        email: m.email,
      }))

      setMembers(mappedMembers)
      setUserRole(data.role || 'member')

      const orgRes = await fetch('/api/organization')
      if (orgRes.ok) {
        const orgData = await orgRes.json()
        setOrgData(orgData)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load team data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  const handleInvite = async (email: string, role: 'admin' | 'member') => {
    const res = await fetch('/api/team/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send invitation')
    setShowInviteDialog(false)
    await fetchTeam()
  }

  const handleRemoveMember = async () => {
    if (!confirmAction) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/team/members/${confirmAction.member.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove member')
      }
      setConfirmAction(null)
      await fetchTeam()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangeRole = async () => {
    if (!confirmAction) return
    setActionLoading(true)
    const newRole = confirmAction.member.role === 'admin' ? 'member' : 'admin'
    try {
      const res = await fetch(`/api/team/members/${confirmAction.member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to change role')
      }
      setConfirmAction(null)
      await fetchTeam()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevokeInvitation = async () => {
    if (!confirmAction) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/team/members/${confirmAction.member.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to revoke invitation')
      }
      setConfirmAction(null)
      await fetchTeam()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    } catch { return dateStr }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                </div>
                <div className="h-6 w-16 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const isAdmin = userRole === 'admin'
  const planTier = orgData?.organization?.plan_tier || 'standard'
  const maxMembers = orgData?.maxMembers || 1
  const activeCount = members.filter((m) => m.status === 'active').length
  const hasReachedLimit = activeCount >= maxMembers

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
                <p className="text-sm text-slate-500">
                  {activeCount} of {maxMembers} members used
                  {planTier === 'premium' ? ' • Premium Plan' : ' • Standard Plan'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={fetchTeam} className="text-slate-600">
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
              {isAdmin && (
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" size="sm" onClick={() => setShowInviteDialog(true)} disabled={hasReachedLimit}>
                  <UserPlus className="h-4 w-4 mr-1" /> Invite Member
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {planTier === 'standard' && isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <Rocket className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Standard Plan</p>
            <p>Your plan includes 1 seat. Upgrade to <strong>Premium ($79/mo)</strong> for up to 10 team members.</p>
          </div>
        </div>
      )}

      {hasReachedLimit && isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Member limit reached</p>
            <p>You've used all {maxMembers} seats. Remove a member or upgrade your plan.</p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0 divide-y divide-slate-100">
          {members.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">No team members yet</p>
              <p className="text-xs text-slate-400 mt-1">
                {isAdmin ? 'Invite your first teammate to get started.' : 'Your team hasn\'t added anyone yet.'}
              </p>
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                {member.status === 'invited' ? (
                  <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                ) : (
                  <MemberAvatar name={member.profile_name || member.profile_email || '?'} size="sm" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {member.profile_name || member.profile_email || member.email || 'Unknown'}
                    </span>
                    {member.status === 'invited' && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Invited</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {member.profile_email || member.email}
                    {member.created_at && ` • Joined ${formatDate(member.created_at)}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}
                    className={member.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'}>
                    {member.role === 'admin' ? <ShieldAlert className="h-3 w-3 mr-1" /> : <Shield className="h-3 w-3 mr-1" />}
                    {member.role === 'admin' ? 'Admin' : 'Member'}
                  </Badge>

                  {isAdmin && member.status === 'active' && (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === member.id ? null : member.id) }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openDropdownId === member.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                          <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            onClick={() => { setConfirmAction({ type: 'role', member }); setOpenDropdownId(null) }}>
                            {member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                          </button>
                          <hr className="my-1 border-slate-100" />
                          <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            onClick={() => { setConfirmAction({ type: 'remove', member }); setOpenDropdownId(null) }}>
                            Remove from Team
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {isAdmin && member.status === 'invited' && (
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Resend invitation"
                        onClick={async () => { try { await handleInvite(member.email || member.profile_email || '', member.role) } catch {} }}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Revoke invitation"
                        onClick={() => setConfirmAction({ type: 'revoke', member })}>
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <InviteMemberDialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)} onSubmit={handleInvite} />

      <ConfirmActionDialog open={confirmAction?.type === 'remove'} onClose={() => setConfirmAction(null)} onConfirm={handleRemoveMember}
        title="Remove team member?"
        description={confirmAction ? `Remove ${confirmAction.member.profile_name || confirmAction.member.profile_email || 'this person'} from your team? They will lose access to all organization data. This action cannot be undone.` : ''}
        confirmLabel="Remove" variant="danger" loading={actionLoading} />

      <ConfirmActionDialog open={confirmAction?.type === 'role'} onClose={() => setConfirmAction(null)} onConfirm={handleChangeRole}
        title={confirmAction?.member.role === 'admin' ? 'Demote to Member?' : 'Promote to Admin?'}
        description={confirmAction ? (confirmAction.member.role === 'admin'
          ? `Demote ${confirmAction.member.profile_name || confirmAction.member.profile_email || 'this person'} to Member? They will lose access to billing, integrations, and team management settings.`
          : `Promote ${confirmAction.member.profile_name || confirmAction.member.profile_email || 'this person'} to Admin? Admins have full access to all settings, including billing and integrations.`) : ''}
        confirmLabel={confirmAction?.member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
        variant="warning" loading={actionLoading} />

      <ConfirmActionDialog open={confirmAction?.type === 'revoke'} onClose={() => setConfirmAction(null)} onConfirm={handleRevokeInvitation}
        title="Revoke invitation?"
        description={confirmAction ? `Revoke the invitation for ${confirmAction.member.email || confirmAction.member.profile_email || 'this email'}? They will no longer be able to join your organization via this link.` : ''}
        confirmLabel="Revoke" variant="danger" loading={actionLoading} />
    </div>
  )
}
