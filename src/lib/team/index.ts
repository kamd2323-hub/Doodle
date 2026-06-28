/**
 * Team & Organization utility library for Reclaim AI.
 * Provides helpers for resolving user org membership, managing members,
 * and handling invitations — with dual-persistence (Supabase + local mock file).
 */
import { createClient } from '@/lib/supabase-server'
import * as fs from 'fs'
import { randomUUID } from 'crypto'

const ORG_STORE_PATH = '/tmp/mock_organization_data.json'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Organization {
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
  created_at: string
  updated_at: string
}

export interface OrgMember {
  id: string
  organization_id: string
  profile_id: string
  role: 'admin' | 'member'
  invited_by?: string
  invited_at?: string
  accepted_at?: string
  status: 'active' | 'invited' | 'suspended'
  created_at: string
  updated_at: string
  /** Joined profile info (populated on read) */
  profile_name?: string
  profile_email?: string
}

export interface TeamInvitation {
  id: string
  organization_id: string
  invited_by: string
  email: string
  role: 'admin' | 'member'
  token: string
  expires_at: string
  accepted_at?: string
  created_at: string
}

export interface OrgStoreData {
  organizations: Organization[]
  members: OrgMember[]
  invitations: TeamInvitation[]
}

type OrgStore = OrgStoreData

// ─── Mock Store Helpers ──────────────────────────────────────────────────────

function loadStore(): OrgStore {
  try {
    if (fs.existsSync(ORG_STORE_PATH)) {
      const raw = fs.readFileSync(ORG_STORE_PATH, 'utf-8')
      const data = JSON.parse(raw)
      return {
        organizations: data.organizations || [],
        members: data.members || [],
        invitations: data.invitations || [],
      }
    }
  } catch (err) {
    console.warn('[TeamLib] Failed to read mock store:', err)
  }
  return { organizations: [], members: [], invitations: [] }
}

function saveStore(store: OrgStore): void {
  try {
    fs.writeFileSync(ORG_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch (err) {
    console.error('[TeamLib] Failed to write mock store:', err)
  }
}

function ensureDefaultOrg(profileId: string, profileName?: string): { org: Organization; member: OrgMember } {
  const store = loadStore()
  const existingMember = store.members.find(m => m.profile_id === profileId && m.status === 'active')
  if (existingMember) {
    const org = store.organizations.find(o => o.id === existingMember.organization_id)
    if (org) return { org, member: existingMember }
  }

  // Create default org for this profile
  const now = new Date().toISOString()
  const org: Organization = {
    id: randomUUID(),
    name: profileName || 'My Organization',
    slug: (profileName || 'my-org').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80),
    plan_tier: 'standard',
    max_members: 1,
    created_at: now,
    updated_at: now,
  }
  const member: OrgMember = {
    id: randomUUID(),
    organization_id: org.id,
    profile_id: profileId,
    role: 'admin',
    invited_by: profileId,
    accepted_at: now,
    status: 'active',
    created_at: now,
    updated_at: now,
  }
  store.organizations.push(org)
  store.members.push(member)
  saveStore(store)
  return { org, member }
}

// ─── Auth / Session Helpers ──────────────────────────────────────────────────

export interface AuthContext {
  userId: string
  organizationId: string | null
  role: 'admin' | 'member' | null
  isMock: boolean
}

/**
 * Resolve the current user's auth context: userId, org membership, role.
 * Falls back to mock-user-id / mock org when Supabase isn't configured.
 */
export async function getAuthContext(): Promise<AuthContext> {
  let userId = 'mock-user-id'
  let supabase: any = null
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  try {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
    }
  } catch (e) {
    console.warn('[TeamLib] Supabase auth check failed, using mock-user-id:', e)
  }

  let organizationId: string | null = null
  let role: 'admin' | 'member' | null = null

  // Try Supabase first
  if (supabase && !isMock) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single()
      if (profile?.organization_id) {
        organizationId = profile.organization_id
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', organizationId)
          .eq('profile_id', userId)
          .eq('status', 'active')
          .single()
        if (membership) {
          role = membership.role
        }
      }
    } catch (err) {
      console.warn('[TeamLib] Supabase org lookup failed:', err)
    }
  }

  // Fallback to mock store
  if (!organizationId) {
    const resolved = ensureDefaultOrg(userId)
    organizationId = resolved.org.id
    role = resolved.member.role as 'admin' | 'member'
  }

  return { userId, organizationId, role, isMock }
}

/**
 * Check if the current user has admin role. Returns 403 JSON response if not.
 */
export function requireAdmin(role: 'admin' | 'member' | null): { allowed: boolean; response?: Response } {
  if (role !== 'admin') {
    return {
      allowed: false,
      response: new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }
  return { allowed: true }
}

// ─── Team Members ────────────────────────────────────────────────────────────

export async function listMembers(orgId: string): Promise<{ members: OrgMember[]; error?: string }> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!isMock) {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          profile_id,
          role,
          invited_by,
          invited_at,
          accepted_at,
          status,
          created_at,
          updated_at,
          profile:profiles!profile_id (business_name, contact_email)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })
      if (!error && data) {
        return {
          members: data.map((m: any) => ({
            ...m,
            profile_name: m.profile?.business_name || '',
            profile_email: m.profile?.contact_email || '',
          })),
        }
      }
    } catch (err) {
      console.warn('[TeamLib] Supabase listMembers failed:', err)
    }
  }

  // Fallback to mock
  const store = loadStore()
  const mockMembers = store.members.filter(m => m.organization_id === orgId)
  return { members: mockMembers }
}

export async function addMember(
  orgId: string,
  profileId: string,
  role: 'admin' | 'member',
  invitedBy: string
): Promise<{ member?: OrgMember; error?: string }> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!isMock) {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgId,
          profile_id: profileId,
          role,
          invited_by: invitedBy,
          status: 'active',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()
      if (!error && data) return { member: data }
    } catch (err) {
      console.warn('[TeamLib] Supabase addMember failed:', err)
    }
  }

  // Fallback to mock
  const store = loadStore()
  const existing = store.members.find(m => m.organization_id === orgId && m.profile_id === profileId)
  if (existing) {
    return { error: 'Member already exists in this organization' }
  }
  const now = new Date().toISOString()
  const member: OrgMember = {
    id: randomUUID(),
    organization_id: orgId,
    profile_id: profileId,
    role,
    invited_by: invitedBy,
    accepted_at: now,
    status: 'active',
    created_at: now,
    updated_at: now,
  }
  store.members.push(member)
  saveStore(store)
  return { member }
}

export async function updateMemberRole(
  orgId: string,
  memberId: string,
  newRole: 'admin' | 'member'
): Promise<{ member?: OrgMember; error?: string }> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!isMock) {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('organization_members')
        .update({ role: newRole, updated_at: now })
        .eq('id', memberId)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (!error && data) return { member: data }
    } catch (err) {
      console.warn('[TeamLib] Supabase updateMemberRole failed:', err)
    }
  }

  // Fallback to mock
  const store = loadStore()
  const idx = store.members.findIndex(m => m.id === memberId && m.organization_id === orgId)
  if (idx === -1) return { error: 'Member not found' }
  store.members[idx].role = newRole
  store.members[idx].updated_at = new Date().toISOString()
  saveStore(store)
  return { member: store.members[idx] }
}

export async function removeMember(
  orgId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!isMock) {
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)
        .eq('organization_id', orgId)
      if (!error) return { success: true }
    } catch (err) {
      console.warn('[TeamLib] Supabase removeMember failed:', err)
    }
  }

  // Fallback to mock
  const store = loadStore()
  const idx = store.members.findIndex(m => m.id === memberId && m.organization_id === orgId)
  if (idx === -1) return { success: false, error: 'Member not found' }
  store.members.splice(idx, 1)
  saveStore(store)
  return { success: true }
}

// ─── Invitations ─────────────────────────────────────────────────────────────

function generateInviteToken(): string {
  const bytes = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
  return bytes.slice(0, 48)
}

export async function createInvitation(
  orgId: string,
  invitedBy: string,
  email: string,
  role: 'admin' | 'member'
): Promise<{ invitation?: TeamInvitation; error?: string }> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!isMock) {
    try {
      const now = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          organization_id: orgId,
          invited_by: invitedBy,
          email,
          role,
          token: generateInviteToken(),
          expires_at: expiresAt,
          created_at: now,
        })
        .select()
        .single()
      if (!error && data) return { invitation: data }
    } catch (err) {
      console.warn('[TeamLib] Supabase createInvitation failed:', err)
    }
  }

  // Fallback to mock
  const store = loadStore()
  const existing = store.invitations.find(
    inv => inv.organization_id === orgId && inv.email === email && !inv.accepted_at
  )
  if (existing) {
    // Check if still valid
    if (new Date(existing.expires_at) > new Date()) {
      return { error: 'An active invitation already exists for this email' }
    }
  }

  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const invitation: TeamInvitation = {
    id: randomUUID(),
    organization_id: orgId,
    invited_by: invitedBy,
    email,
    role,
    token: generateInviteToken(),
    expires_at: expiresAt,
    created_at: now,
  }
  store.invitations.push(invitation)
  saveStore(store)
  return { invitation }
}

export async function resolveInvitation(
  token: string
): Promise<{ invitation?: TeamInvitation; org_name?: string; error?: string }> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!isMock) {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*, organization:organizations!organization_id(name)')
        .eq('token', token)
        .single()
      if (!error && data) {
        if (new Date(data.expires_at) < new Date()) {
          return { error: 'Invitation has expired' }
        }
        if (data.accepted_at) {
          return { error: 'Invitation has already been accepted' }
        }
        return {
          invitation: data,
          org_name: data.organization?.name,
        }
      }
    } catch (err) {
      console.warn('[TeamLib] Supabase resolveInvitation failed:', err)
    }
  }

  // Fallback to mock
  const store = loadStore()
  const inv = store.invitations.find(inv => inv.token === token)
  if (!inv) return { error: 'Invitation not found' }
  if (new Date(inv.expires_at) < new Date()) return { error: 'Invitation has expired' }
  if (inv.accepted_at) return { error: 'Invitation has already been accepted' }

  const org = store.organizations.find(o => o.id === inv.organization_id)
  return { invitation: inv, org_name: org?.name }
}

export async function acceptInvitation(
  token: string,
  profileId: string
): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!isMock) {
    try {
      // Resolve the invitation first
      const { data: inv, error: resolveErr } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('token', token)
        .single()
      if (resolveErr || !inv) return { success: false, error: 'Invitation not found' }
      if (new Date(inv.expires_at) < new Date()) return { success: false, error: 'Invitation has expired' }
      if (inv.accepted_at) return { success: false, error: 'Invitation has already been accepted' }

      const now = new Date().toISOString()

      // Accept the invitation
      const { error: acceptErr } = await supabase
        .from('team_invitations')
        .update({ accepted_at: now })
        .eq('id', inv.id)
      if (acceptErr) return { success: false, error: acceptErr.message }

      // Create membership
      const { error: memberErr } = await supabase
        .from('organization_members')
        .insert({
          organization_id: inv.organization_id,
          profile_id: profileId,
          role: inv.role,
          invited_by: inv.invited_by,
          accepted_at: now,
          status: 'active',
          created_at: now,
          updated_at: now,
        })
      if (memberErr) return { success: false, error: memberErr.message }

      // Link profile to org
      await supabase
        .from('profiles')
        .update({ organization_id: inv.organization_id })
        .eq('id', profileId)

      return { success: true, organizationId: inv.organization_id }
    } catch (err: any) {
      console.warn('[TeamLib] Supabase acceptInvitation failed:', err)
      return { success: false, error: err.message || 'Internal error' }
    }
  }

  // Fallback to mock
  const store = loadStore()
  const inv = store.invitations.find(inv => inv.token === token)
  if (!inv) return { success: false, error: 'Invitation not found' }
  if (new Date(inv.expires_at) < new Date()) return { success: false, error: 'Invitation has expired' }
  if (inv.accepted_at) return { success: false, error: 'Invitation has already been accepted' }

  const now = new Date().toISOString()
  inv.accepted_at = now

  const member: OrgMember = {
    id: randomUUID(),
    organization_id: inv.organization_id,
    profile_id: profileId,
    role: inv.role,
    invited_by: inv.invited_by,
    accepted_at: now,
    status: 'active',
    created_at: now,
    updated_at: now,
  }
  store.members.push(member)
  saveStore(store)

  return { success: true, organizationId: inv.organization_id }
}

// ─── Organization Settings ───────────────────────────────────────────────────

export async function getOrganization(orgId: string): Promise<{ org?: Organization; error?: string }> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  if (!isMock) {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()
      if (!error && data) return { org: data }
    } catch (err) {
      console.warn('[TeamLib] Supabase getOrganization failed:', err)
    }
  }

  // Fallback to mock
  const store = loadStore()
  const org = store.organizations.find(o => o.id === orgId)
  if (!org) return { error: 'Organization not found' }
  return { org }
}

export async function updateOrganization(
  orgId: string,
  updates: Partial<Organization>
): Promise<{ org?: Organization; error?: string }> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  // Sanitize: only allow mutable fields
  const allowedFields: (keyof Organization)[] = [
    'name', 'slug', 'billing_email', 'custom_domain', 'logo_url',
    'primary_color', 'from_name', 'from_email',
  ]
  const sanitized: any = {}
  for (const field of allowedFields) {
    if (updates[field] !== undefined) sanitized[field] = updates[field]
  }
  sanitized.updated_at = new Date().toISOString()

  if (!isMock) {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update(sanitized)
        .eq('id', orgId)
        .select()
        .single()
      if (!error && data) return { org: data }
    } catch (err) {
      console.warn('[TeamLib] Supabase updateOrganization failed:', err)
    }
  }

  // Fallback to mock
  const store = loadStore()
  const idx = store.organizations.findIndex(o => o.id === orgId)
  if (idx === -1) return { error: 'Organization not found' }
  store.organizations[idx] = { ...store.organizations[idx], ...sanitized }
  saveStore(store)
  return { org: store.organizations[idx] }
}
