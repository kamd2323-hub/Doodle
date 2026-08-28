import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { computeOnboardingStep } from '@/lib/onboarding'
import * as fs from 'fs'

const ORG_STORE_PATH = '/tmp/mock_organization_data.json'

function loadMockStore(): any {
  try {
    if (fs.existsSync(ORG_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(ORG_STORE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return { organizations: [], members: [], invitations: [] }
}

/**
 * GET /api/onboarding
 *
 * Returns the current onboarding state for the authenticated user:
 * - currentStep: which step they're on
 * - steps: array of all steps with completion status, labels, and CTAs
 * - isComplete: whether onboarding is fully done
 */
export async function GET(request: Request) {
  try {
    let userId = 'mock-user-id'
    let orgId: string = '00000000-0000-0000-0000-000000000001'
    let supabase: any = null

    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

    try {
      supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id

      // Resolve organization
      if (!isMock) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userId)
          .single()
        if (profile?.organization_id) orgId = profile.organization_id
      }
    } catch (e) {
      console.warn('[Onboarding API] Auth check failed:', e)
    }

    // Mock fallback
    if (!orgId) {
      const store = loadMockStore()
      const member = store.members?.find(
        (m: any) => m.profile_id === userId && m.status === 'active'
      )
      if (member) orgId = member.organization_id
      else orgId = '00000000-0000-0000-0000-000000000001'
    }

    const state = await computeOnboardingStep(userId, orgId)

    return NextResponse.json(state)
  } catch (error: any) {
    console.error('[Onboarding API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'