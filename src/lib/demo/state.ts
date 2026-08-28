/**
 * Demo mode state assembler for Reclaim AI.
 *
 * Imports mock data from ./mock-data.ts and assembles the full
 * DemoState object. This is the single entry point for demo pages.
 *
 * All data is deterministic — same output every call. No database writes.
 */

export type { DemoState } from './mock-data'

import {
  CLIENTS,
  INVOICES,
  buildDefaultSequence,
  CAMPAIGNS,
  EMAIL_LOGS,
  UPCOMING_ACTIONS,
  ANALYTICS,
  STATS,
} from './mock-data'

/**
 * Returns the complete demo state. Deterministic — same output every call.
 */
export function getDemoState() {
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