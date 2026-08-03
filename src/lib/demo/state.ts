/**
 * Demo mode state generator for Reclaim AI.
 *
 * Returns realistic mock data for the full dashboard experience:
 * organization, clients, invoices, sequences, campaigns, analytics,
 * recent activity, and upcoming actions.
 *
 * All data is deterministic — same output every call. No database writes.
 */

export interface DemoClient {
  id: string
  name: string
  email: string
  company_name: string
}

export interface DemoInvoice {
  id: string
  invoice_number: string
  amount_due_cents: number
  currency: string
  due_at: string
  payment_link: string
  client_id: string
  status: 'paid' | 'open' | 'past_due'
}

export interface DemoSequenceStep {
  id: string
  step_number: number
  delay_days: number
  email_subject: string
  email_body: string
}

export interface DemoSequence {
  id: string
  name: string
  description: string
  is_default: boolean
  is_active: boolean
  steps: DemoSequenceStep[]
}

export interface DemoCampaign {
  id: string
  status: 'active' | 'recovered' | 'paused'
  created_at: string
  next_action_at: string | null
  last_action_at: string | null
  invoice_number: string
  client_name: string
  sequence_name: string
  current_step: number
  total_steps: number
}

export interface DemoAnalytics {
  summary: {
    totalRecoveredCents: number
    recoveryRate: number
    totalCampaigns: number
    activeCampaigns: number
    recoveredCampaigns: number
    failedCampaigns: number
    totalEmailsSent: number
    deliveredEmails: number
    openedEmails: number
    bouncedEmails: number
    deliveryRate: number
    openRate: number
    averageRecoveryAmount: number
  }
  monthly: Array<{
    month: string
    year: number
    recoveredCents: number
    emailsSent: number
    campaignsCreated: number
  }>
  recentRecoveries: Array<{
    invoiceNumber: string
    clientName: string
    amountCents: number
    recoveredAt: string
  }>
}

export interface DemoDashboardStats {
  name: string
  value: string
  description: string
  icon: string
}

export interface DemoEmailLog {
  id: string
  recipient_email: string
  status: 'sent' | 'delivered' | 'opened' | 'bounced'
  sent_at: string
  invoice_number: string
}

export interface DemoUpcomingAction {
  id: string
  invoice_number: string
  next_action_at: string
  step_number: number
  client_name: string
}

export interface DemoState {
  organization: {
    id: string
    name: string
    plan_tier: string
  }
  from_name: string
  stats: DemoDashboardStats[]
  activeIntegrations: string[]
  clients: DemoClient[]
  invoices: DemoInvoice[]
  sequences: DemoSequence[]
  campaigns: DemoCampaign[]
  analytics: DemoAnalytics
  recentLogs: DemoEmailLog[]
  upcomingActions: DemoUpcomingAction[]
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

const CLIENTS: DemoClient[] = [
  { id: 'demo-client-1', name: 'Sarah Chen', email: 'sarah@brightpath.co', company_name: 'BrightPath Ventures' },
  { id: 'demo-client-2', name: 'Marcus Webb', email: 'marcus@webbinteractive.com', company_name: 'Webb Interactive' },
  { id: 'demo-client-3', name: 'Elena Rossi', email: 'elena@rossidesign.co', company_name: 'Rossi Design Studio' },
  { id: 'demo-client-4', name: 'James Okonkwo', email: 'james@okonkwoconsulting.com', company_name: 'Okonkwo Consulting' },
]

const INVOICES: DemoInvoice[] = [
  {
    id: 'demo-inv-1',
    invoice_number: 'INV-2026-0142',
    amount_due_cents: 450000,
    currency: 'usd',
    due_at: daysAgo(3),
    payment_link: 'https://demo.stripe.com/invoice/INV-2026-0142',
    client_id: 'demo-client-1',
    status: 'past_due',
  },
  {
    id: 'demo-inv-2',
    invoice_number: 'INV-2026-0138',
    amount_due_cents: 285000,
    currency: 'usd',
    due_at: daysAgo(16),
    payment_link: 'https://demo.stripe.com/invoice/INV-2026-0138',
    client_id: 'demo-client-2',
    status: 'past_due',
  },
  {
    id: 'demo-inv-3',
    invoice_number: 'INV-2026-0145',
    amount_due_cents: 120000,
    currency: 'usd',
    due_at: daysAgo(1),
    payment_link: 'https://demo.stripe.com/invoice/INV-2026-0145',
    client_id: 'demo-client-3',
    status: 'open',
  },
  {
    id: 'demo-inv-4',
    invoice_number: 'INV-2026-0135',
    amount_due_cents: 675000,
    currency: 'usd',
    due_at: daysAgo(35),
    payment_link: 'https://demo.stripe.com/invoice/INV-2026-0135',
    client_id: 'demo-client-4',
    status: 'paid',
  },
  {
    id: 'demo-inv-5',
    invoice_number: 'INV-2026-0140',
    amount_due_cents: 310000,
    currency: 'usd',
    due_at: daysAgo(32),
    payment_link: 'https://demo.stripe.com/invoice/INV-2026-0140',
    client_id: 'demo-client-2',
    status: 'paid',
  },
]

function buildDefaultSequence(): DemoSequence {
  return {
    id: 'demo-seq-1',
    name: 'Default Dunning Sequence',
    description: 'Polite, relationship-preserving 3-step recovery sequence',
    is_default: true,
    is_active: true,
    steps: [
      {
        id: 'demo-step-1',
        step_number: 1,
        delay_days: 1,
        email_subject: 'Quick note on invoice {{invoice_number}}',
        email_body: `Hi {{customer_name}},\n\nHope you're well. Just a quick heads-up that invoice {{invoice_number}} for {{amount_due}} — originally due {{due_date}} — appears to still be open.\n\nNo action needed if it's already on its way.\n\nIf it's useful, the easiest way to settle it is here:\n\n{{payment_link}}\n\nThanks,\n{{from_name}}\n{{organization_name}}`,
      },
      {
        id: 'demo-step-2',
        step_number: 2,
        delay_days: 14,
        email_subject: 'Invoice {{invoice_number}} — 14 days past due',
        email_body: `Hi {{customer_name}},\n\nFollowing up on invoice {{invoice_number}} for {{amount_due}}, which was due {{due_date}} and is now 14 days past due.\n\nHere's the payment link in case it's easier to handle right now:\n\n{{payment_link}}\n\nIf something on your end is blocking payment, just reply and I'll help sort it out.\n\nThanks,\n{{from_name}}\n{{organization_name}}`,
      },
      {
        id: 'demo-step-3',
        step_number: 3,
        delay_days: 30,
        email_subject: 'Invoice {{invoice_number}} — needs to be resolved this week',
        email_body: `Hi {{customer_name}},\n\nInvoice {{invoice_number}} for {{amount_due}}, originally due {{due_date}}, is now 30 days past due. I want to resolve this quickly.\n\nThree options:\n\n1. Pay the full amount now: {{payment_link}}\n2. Reply with a payment date you can commit to.\n3. If a payment plan would help, tell me what works.\n\nThanks,\n{{from_name}}\n{{organization_name}}`,
      },
    ],
  }
}

const CAMPAIGNS: DemoCampaign[] = [
  {
    id: 'demo-camp-1',
    status: 'active',
    created_at: daysAgo(2),
    next_action_at: daysFromNow(12),
    last_action_at: daysAgo(2),
    invoice_number: 'INV-2026-0142',
    client_name: 'Sarah Chen',
    sequence_name: 'Default Dunning Sequence',
    current_step: 1,
    total_steps: 3,
  },
  {
    id: 'demo-camp-2',
    status: 'active',
    created_at: daysAgo(15),
    next_action_at: daysFromNow(15),
    last_action_at: daysAgo(1),
    invoice_number: 'INV-2026-0138',
    client_name: 'Marcus Webb',
    sequence_name: 'Default Dunning Sequence',
    current_step: 1,
    total_steps: 3,
  },
  {
    id: 'demo-camp-3',
    status: 'recovered',
    created_at: daysAgo(35),
    next_action_at: null,
    last_action_at: daysAgo(4),
    invoice_number: 'INV-2026-0135',
    client_name: 'James Okonkwo',
    sequence_name: 'Default Dunning Sequence',
    current_step: 3,
    total_steps: 3,
  },
]

const EMAIL_LOGS: DemoEmailLog[] = [
  {
    id: 'demo-log-1',
    recipient_email: 'sarah@brightpath.co',
    status: 'sent',
    sent_at: daysAgo(2),
    invoice_number: 'INV-2026-0142',
  },
  {
    id: 'demo-log-2',
    recipient_email: 'marcus@webbinteractive.com',
    status: 'opened',
    sent_at: daysAgo(1),
    invoice_number: 'INV-2026-0138',
  },
  {
    id: 'demo-log-3',
    recipient_email: 'james@okonkwoconsulting.com',
    status: 'delivered',
    sent_at: daysAgo(4),
    invoice_number: 'INV-2026-0135',
  },
  {
    id: 'demo-log-4',
    recipient_email: 'sarah@brightpath.co',
    status: 'delivered',
    sent_at: daysAgo(3),
    invoice_number: 'INV-2026-0142',
  },
]

const UPCOMING_ACTIONS: DemoUpcomingAction[] = [
  {
    id: 'demo-action-1',
    invoice_number: 'INV-2026-0142',
    next_action_at: daysFromNow(12),
    step_number: 2,
    client_name: 'Sarah Chen',
  },
  {
    id: 'demo-action-2',
    invoice_number: 'INV-2026-0138',
    next_action_at: daysFromNow(15),
    step_number: 2,
    client_name: 'Marcus Webb',
  },
]

const ANALYTICS: DemoAnalytics = {
  summary: {
    totalRecoveredCents: 985000,
    recoveryRate: 74.2,
    totalCampaigns: 12,
    activeCampaigns: 2,
    recoveredCampaigns: 8,
    failedCampaigns: 2,
    totalEmailsSent: 28,
    deliveredEmails: 26,
    openedEmails: 19,
    bouncedEmails: 2,
    deliveryRate: 92.9,
    openRate: 73.1,
    averageRecoveryAmount: 123125,
  },
  monthly: [
    { month: 'March', year: 2026, recoveredCents: 180000, emailsSent: 6, campaignsCreated: 3 },
    { month: 'April', year: 2026, recoveredCents: 245000, emailsSent: 8, campaignsCreated: 4 },
    { month: 'May', year: 2026, recoveredCents: 120000, emailsSent: 5, campaignsCreated: 2 },
    { month: 'June', year: 2026, recoveredCents: 310000, emailsSent: 6, campaignsCreated: 3 },
    { month: 'July', year: 2026, recoveredCents: 130000, emailsSent: 3, campaignsCreated: 2 },
    { month: 'August', year: 2026, recoveredCents: 0, emailsSent: 0, campaignsCreated: 0 },
  ],
  recentRecoveries: [
    { invoiceNumber: 'INV-2026-0135', clientName: 'James Okonkwo', amountCents: 675000, recoveredAt: daysAgo(4) },
    { invoiceNumber: 'INV-2026-0140', clientName: 'Marcus Webb', amountCents: 310000, recoveredAt: daysAgo(10) },
  ],
}

const STATS: DemoDashboardStats[] = [
  { name: 'Total Recovered', value: '$9,850', description: 'Across 8 recovered campaigns', icon: 'DollarSign' },
  { name: 'Recovery Rate', value: '74.2%', description: '8 of 12 campaigns resolved', icon: 'Target' },
  { name: 'Active Campaigns', value: '2', description: '2 invoices in recovery', icon: 'Zap' },
  { name: 'Emails Sent', value: '28', description: '73% open rate', icon: 'Mail' },
]

/**
 * Returns the complete demo state. Deterministic — same output every call.
 */
export function getDemoState(): DemoState {
  return {
    organization: {
      id: 'demo-org-1',
      name: 'Acme Design Studio',
      plan_tier: 'standard',
    },
    from_name: 'Alex',
    stats: STATS,
    activeIntegrations: ['stripe'],
    clients: CLIENTS,
    invoices: INVOICES,
    sequences: [buildDefaultSequence()],
    campaigns: CAMPAIGNS,
    analytics: ANALYTICS,
    recentLogs: EMAIL_LOGS,
    upcomingActions: UPCOMING_ACTIONS,
  }
}
