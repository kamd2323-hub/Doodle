/**
 * Domain management library for Reclaim AI.
 * Wraps the Resend Domains API with dual-persistence (Resend + local mock).
 * Handles domain registration, verification status, and DNS record retrieval.
 */
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase-server'
import * as fs from 'fs'

const MOCK_STORE_PATH = '/tmp/mock_domains.json'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ResendDomainRecord {
  record: string             // 'SPF' | 'DKIM' | 'DKIM2' | 'DMARC' | 'MX'
  type: string               // 'txt' | 'mx' | 'cname'
  name: string
  value: string
  status: string             // 'pending' | 'verified' | 'failed' | 'not_started'
  routing_policy?: string
  priority?: number
  ttl?: string
}

export interface ManagedDomain {
  id: string
  domain: string
  status: string             // 'pending' | 'verified' | 'failed' | 'not_started'
  region?: string
  records: ResendDomainRecord[]
  created_at: string
  updated_at?: string
}

interface MockStore {
  domains: ManagedDomain[]
}

// ─── Resend Client ───────────────────────────────────────────────────────────

const resendApiKey = process.env.RESEND_API_KEY
const isProduction = resendApiKey && resendApiKey !== 're_123' && resendApiKey.startsWith('re_')

function getResend(): Resend | null {
  if (!isProduction) return null
  return new Resend(resendApiKey!)
}

// ─── Mock Store ──────────────────────────────────────────────────────────────

function loadStore(): MockStore {
  try {
    if (fs.existsSync(MOCK_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(MOCK_STORE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return { domains: [] }
}

function saveStore(store: MockStore): void {
  try {
    fs.writeFileSync(MOCK_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch { /* ignore */ }
}

// ─── Domain Management ───────────────────────────────────────────────────────

/**
 * Register a new sending domain with Resend.
 * Returns the domain info including DNS records to configure.
 */
export async function createDomain(
  domainName: string,
  region: string = 'us-east-1',
  options?: { openTracking?: boolean; clickTracking?: boolean; tls?: string }
): Promise<{ domain?: ManagedDomain; error?: string }> {
  const resend = getResend()

  if (resend) {
    try {
      const { data, error } = await resend.domains.create({
        name: domainName,
        region: region as any,
        openTracking: options?.openTracking,
        clickTracking: options?.clickTracking,
      })
      if (error) {
        return { error: `Resend API error: ${error.message}` }
      }
      if (!data) {
        return { error: 'No data returned from Resend' }
      }
      // The Resend SDK returns CreateDomainResponseSuccess which has records
      const domainResult = data as any
      return {
        domain: {
          id: domainResult.id,
          domain: domainResult.name,
          status: domainResult.status || 'pending',
          region: domainResult.region,
          records: (domainResult.records || []).map((r: any) => ({
            record: r.record,
            type: r.type,
            name: r.name,
            value: r.value,
            status: r.status || 'pending',
          })),
          created_at: domainResult.created_at || new Date().toISOString(),
        },
      }
    } catch (err: any) {
      console.error('[Domains] Resend createDomain failed:', err)
      return { error: err.message || 'Failed to create domain via Resend' }
    }
  }

  // Mock fallback
  const store = loadStore()
  const existing = store.domains.find(d => d.domain === domainName)
  if (existing) {
    return { error: `Domain "${domainName}" is already registered` }
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const managedDomain: ManagedDomain = {
    id,
    domain: domainName,
    status: 'not_started',
    region,
    records: [
      {
        record: 'SPF',
        type: 'txt',
        name: domainName,
        value: `v=spf1 include:spf.resend.com ~all`,
        status: 'not_started',
      },
      {
        record: 'DKIM',
        type: 'txt',
        name: `resend._domainkey.${domainName}`,
        value: `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDB+bV7...`,
        status: 'not_started',
      },
      {
        record: 'DMARC',
        type: 'txt',
        name: `_dmarc.${domainName}`,
        value: `v=DMARC1; p=none; rua=mailto:dmarc@${domainName}`,
        status: 'not_started',
      },
    ],
    created_at: now,
    updated_at: now,
  }
  store.domains.push(managedDomain)
  saveStore(store)
  return { domain: managedDomain }
}

/**
 * List all domains registered with Resend.
 */
export async function listDomains(): Promise<{ domains: ManagedDomain[]; error?: string }> {
  const resend = getResend()

  if (resend) {
    try {
      const { data, error } = await resend.domains.list()
      if (error) {
        return { domains: [], error: `Resend API error: ${error.message}` }
      }
      if (!data) {
        return { domains: [] }
      }
      const domains: ManagedDomain[] = (data.data || []).map((d: any) => ({
        id: d.id,
        domain: d.name,
        status: d.status,
        region: d.region,
        records: (d.records || []).map((r: any) => ({
          record: r.record,
          type: r.type,
          name: r.name,
          value: r.value,
          status: r.status,
        })),
        created_at: d.created_at,
      }))
      return { domains }
    } catch (err: any) {
      console.error('[Domains] Resend listDomains failed:', err)
      return { domains: [], error: err.message }
    }
  }

  // Mock fallback
  const store = loadStore()
  return { domains: store.domains }
}

/**
 * Get a single domain by Resend domain ID.
 */
export async function getDomain(domainId: string): Promise<{ domain?: ManagedDomain; error?: string }> {
  const resend = getResend()

  if (resend) {
    try {
      const { data, error } = await resend.domains.get(domainId)
      if (error) {
        return { error: `Resend API error: ${error.message}` }
      }
      if (!data) {
        return { error: 'Domain not found' }
      }
      const d = data as any
      return {
        domain: {
          id: d.id,
          domain: d.name,
          status: d.status,
          region: d.region,
          records: (d.records || []).map((r: any) => ({
            record: r.record,
            type: r.type,
            name: r.name,
            value: r.value,
            status: r.status,
          })),
          created_at: d.created_at,
        },
      }
    } catch (err: any) {
      console.error('[Domains] Resend getDomain failed:', err)
      return { error: err.message || 'Failed to get domain' }
    }
  }

  // Mock fallback
  const store = loadStore()
  const domain = store.domains.find(d => d.id === domainId)
  if (!domain) return { error: 'Domain not found' }
  return { domain }
}

/**
 * Delete a domain from Resend.
 */
export async function removeDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
  const resend = getResend()

  if (resend) {
    try {
      const { data, error } = await resend.domains.remove(domainId)
      if (error) {
        return { success: false, error: `Resend API error: ${error.message}` }
      }
      if (!data) {
        return { success: false, error: 'No response from Resend' }
      }
      return { success: true }
    } catch (err: any) {
      console.error('[Domains] Resend removeDomain failed:', err)
      return { success: false, error: err.message }
    }
  }

  // Mock fallback
  const store = loadStore()
  const idx = store.domains.findIndex(d => d.id === domainId)
  if (idx === -1) return { success: false, error: 'Domain not found' }
  store.domains.splice(idx, 1)
  saveStore(store)
  return { success: true }
}

/**
 * Trigger domain re-verification on Resend.
 */
export async function verifyDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
  const resend = getResend()

  if (resend) {
    try {
      const { data, error } = await resend.domains.verify(domainId)
      if (error) {
        return { success: false, error: `Resend API error: ${error.message}` }
      }
      if (!data) {
        return { success: false, error: 'No response from Resend' }
      }
      return { success: true }
    } catch (err: any) {
      console.error('[Domains] Resend verifyDomain failed:', err)
      return { success: false, error: err.message }
    }
  }

  // Mock fallback — update status to pending for simulation
  const store = loadStore()
  const domain = store.domains.find(d => d.id === domainId)
  if (!domain) return { success: false, error: 'Domain not found' }
  domain.status = 'pending'
  domain.records = domain.records.map(r => ({ ...r, status: 'pending' }))
  domain.updated_at = new Date().toISOString()
  saveStore(store)
  return { success: true }
}

// ─── Org Domain Resolution ───────────────────────────────────────────────────

/**
 * Get the best verified domain for an organization to use as a sender.
 * Checks: org.from_email > org.custom_domain (verified) > environment default.
 */
export async function resolveOrgSender(orgId: string): Promise<{
  fromEmail: string
  fromName: string
  isVerified: boolean
}> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  let fromName = 'Reclaim AI'
  let fromEmail = process.env.FROM_EMAIL_ADDRESS || 'onboarding@resend.dev'
  let customDomain: string | null = null
  let verifiedDomainName: string | null = null
  let orgFromEmail: string | null = null

  // 1. Get org settings
  if (!isMock) {
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('from_name, from_email, custom_domain')
        .eq('id', orgId)
        .single()
      if (org) {
        fromName = org.from_name || 'Reclaim AI'
        customDomain = org.custom_domain || null
        orgFromEmail = org.from_email || null
      }
    } catch { /* fall through */ }
  }

  // 2. Check if any registered domains are verified
  const { domains } = await listDomains()
  const verifiedDomain = domains.find(d => d.status === 'verified')
  if (verifiedDomain) {
    verifiedDomainName = verifiedDomain.domain
  }

  // 3. Determine the best from-address
  if (orgFromEmail) {
    fromEmail = orgFromEmail
  } else if (verifiedDomainName) {
    const slug = fromName.toLowerCase().replace(/[^a-z0-9]/g, '')
    fromEmail = `hello@${verifiedDomainName}`
    customDomain = verifiedDomainName
  } else if (customDomain) {
    fromEmail = `hello@${customDomain}`
  }

  return {
    fromEmail: `${fromName} <${fromEmail}>`,
    fromName,
    isVerified: !!verifiedDomainName || !!orgFromEmail && customDomain !== null,
  }
}

/**
 * Get all domains that are verified and ready to send from.
 */
export async function getVerifiedDomains(): Promise<ManagedDomain[]> {
  const { domains } = await listDomains()
  return domains.filter(d => d.status === 'verified')
}

/**
 * Check if a domain is verified or still pending.
 */
export async function getDomainVerificationStatus(
  domainId: string
): Promise<{ status: string; records: ResendDomainRecord[]; error?: string }> {
  const { domain, error } = await getDomain(domainId)
  if (error || !domain) {
    return { status: 'unknown', records: [], error }
  }
  return { status: domain.status, records: domain.records }
}