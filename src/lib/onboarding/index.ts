/**
 * Onboarding state machine for Reclaim AI.
 * Tracks a user's progress through initial setup steps and determines
 * what needs to happen next.
 *
 * Steps: welcome → connect_stripe → configure_sequence → activate → complete
 */
import { createClient } from '@/lib/supabase-server'
import * as fs from 'fs'

// ─── Types ───────────────────────────────────────────────────────────────────

export type OnboardingStep =
  | 'welcome'
  | 'connect_stripe'
  | 'configure_sequence'
  | 'activate'
  | 'complete'

export interface StepRequirement {
  step: OnboardingStep
  label: string
  description: string
  completed: boolean
  cta: string
  ctaHref: string
}

export interface OnboardingState {
  currentStep: OnboardingStep
  steps: StepRequirement[]
  isComplete: boolean
}

const ORG_STORE_PATH = '/tmp/mock_organization_data.json'
const PROGRESS_STORE_PATH = '/tmp/mock_onboarding_progress.json'

// ─── Step Definitions ────────────────────────────────────────────────────────

const STEP_DEFS: Omit<StepRequirement, 'completed'>[] = [
  {
    step: 'welcome',
    label: 'Welcome to Reclaim AI',
    description: 'Your account is ready. Let\'s get you set up to recover past-due invoices.',
    cta: 'Get Started',
    ctaHref: '/settings',
  },
  {
    step: 'connect_stripe',
    label: 'Connect Stripe',
    description: 'Link your Stripe account so we can watch for past-due invoices.',
    cta: 'Connect Stripe',
    ctaHref: '/settings',
  },
  {
    step: 'configure_sequence',
    label: 'Configure Email Sequence',
    description: 'Set up your dunning email templates — we\'ll personalize them with AI.',
    cta: 'Configure Sequence',
    ctaHref: '/sequences',
  },
  {
    step: 'activate',
    label: 'Activate Your First Campaign',
    description: 'Choose which invoices to pursue and launch your first recovery campaign.',
    cta: 'Activate Campaign',
    ctaHref: '/campaigns',
  },
  {
    step: 'complete',
    label: 'All Set!',
    description: 'Your first campaign is running. Reclaim AI will handle follow-ups automatically.',
    cta: 'View Dashboard',
    ctaHref: '/dashboard',
  },
]

// ─── Mock Store ──────────────────────────────────────────────────────────────

function loadMockProgress(): Record<string, OnboardingStep> {
  try {
    if (fs.existsSync(PROGRESS_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(PROGRESS_STORE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return {}
}

function saveMockProgress(progress: Record<string, OnboardingStep>): void {
  try {
    fs.writeFileSync(PROGRESS_STORE_PATH, JSON.stringify(progress, null, 2), 'utf-8')
  } catch { /* ignore */ }
}

// ─── Core Logic ──────────────────────────────────────────────────────────────

/**
 * Determine the user's current onboarding step by inspecting real state.
 */
export async function computeOnboardingStep(userId: string, orgId: string): Promise<OnboardingState> {
  const supabase = await createClient()
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co'

  // Gather actual state
  let stripeConnected = false
  let hasSequence = false
  let hasActiveCampaign = false

  if (!isMock) {
    try {
      const [connRes, seqRes, campRes] = await Promise.all([
        supabase.from('oauth_connections')
          .select('id')
          .eq('organization_id', orgId)
          .eq('provider', 'stripe')
          .eq('status', 'active')
          .limit(1),
        supabase.from('sequences')
          .select('id')
          .eq('organization_id', orgId)
          .limit(1),
        supabase.from('dunning_campaigns')
          .select('id')
          .eq('organization_id', orgId)
          .eq('status', 'active')
          .limit(1),
      ])

      stripeConnected = (connRes.data?.length || 0) > 0
      hasSequence = (seqRes.data?.length || 0) > 0
      hasActiveCampaign = (campRes.data?.length || 0) > 0
    } catch {
      // fall through to mock
    }
  }

  // Mock fallback: check mock store
  if (!stripeConnected) {
    const orgStore = loadOrgStore()
    const conn = (orgStore.oauth_connections || []).find(
      (c: any) => c.organization_id === orgId && c.provider === 'stripe' && c.status === 'active'
    )
    if (conn) stripeConnected = true
  }

  // Map state to step
  let currentStep: OnboardingStep = 'welcome'

  if (hasActiveCampaign) {
    currentStep = 'complete'
  } else if (hasSequence && stripeConnected) {
    currentStep = 'activate'
  } else if (stripeConnected) {
    currentStep = 'configure_sequence'
  } else if (true) {
    // Check if user has done welcome (visited the page once)
    const mockProgress = loadMockProgress()
    if (mockProgress[userId] === 'welcome' || mockProgress[userId] === 'connect_stripe' ||
        mockProgress[userId] === 'configure_sequence' || mockProgress[userId] === 'activate') {
      // Already past welcome, and stripe isn't connected yet
      currentStep = 'connect_stripe'
    } else {
      currentStep = 'welcome'
    }
  }

  // Build step list with completion flags
  const stepOrder: OnboardingStep[] = [
    'welcome', 'connect_stripe', 'configure_sequence', 'activate', 'complete'
  ]

  const completedMap: Record<OnboardingStep, boolean> = {
    welcome: stepOrder.indexOf(currentStep) > stepOrder.indexOf('welcome'),
    connect_stripe: stripeConnected,
    configure_sequence: hasSequence,
    activate: hasActiveCampaign,
    complete: hasActiveCampaign,
  }

  const steps: StepRequirement[] = STEP_DEFS.map(def => ({
    ...def,
    completed: completedMap[def.step],
  }))

  return {
    currentStep,
    steps,
    isComplete: currentStep === 'complete',
  }
}

/**
 * Advance to the next step. This is primarily a tracking function —
 * the actual state is determined by checking real data (Stripe connection,
 * sequences, campaigns). We'll still record the intent.
 */
export async function advanceOnboardingStep(
  userId: string,
  orgId: string
): Promise<OnboardingState> {
  // Recompute true state first
  const state = await computeOnboardingStep(userId, orgId)

  // Save intended progress
  const mockProgress = loadMockProgress()
  const stepOrder: OnboardingStep[] = [
    'welcome', 'connect_stripe', 'configure_sequence', 'activate', 'complete'
  ]

  const currentIdx = stepOrder.indexOf(state.currentStep)
  if (currentIdx < stepOrder.length - 1) {
    mockProgress[userId] = stepOrder[currentIdx + 1]
    saveMockProgress(mockProgress)
  }

  // Recompute after advance
  return computeOnboardingStep(userId, orgId)
}

function loadOrgStore(): any {
  try {
    if (fs.existsSync(ORG_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(ORG_STORE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return { organizations: [], members: [], invoices: [], recoveries: [], oauth_connections: [] }
}