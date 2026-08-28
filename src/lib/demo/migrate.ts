/**
 * Demo-to-real migration for Reclaim AI.
 *
 * When a user signs up after trying the demo, this module detects
 * the demo cookie and seeds their account with the default dunning
 * sequence so they pick up right where the demo left off.
 *
 * No database writes happen in demo mode itself — only during the
 * migration triggered by signup/OAuth completion.
 */

import { DEFAULT_TEMPLATES } from '@/lib/dunning/default-templates'
import { createClient } from '@/lib/supabase-server'

/** Name of the cookie set by demo entry. */
export const DEMO_COOKIE_NAME = 'reclaim_demo_mode'

/**
 * Check whether the current request originated from a demo session.
 * Reads the `reclaim_demo_mode` cookie.
 */
export function isDemoSession(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') || ''
  return cookieHeader.includes(`${DEMO_COOKIE_NAME}=true`)
}

/**
 * Seed the default dunning sequence for a user who just
 * migrated from demo mode. Creates a sequence with all 3 default
 * steps.
 *
 * Called during signup or OAuth callback when the demo cookie is
 * detected.
 *
 * @returns The created sequence ID, or null if seeding was skipped.
 */
export async function seedDefaultSequence(
  profileId: string,
): Promise<string | null> {
  const supabase = await createClient()

  // Create the sequence
  const { data: seq, error: seqError } = await supabase
    .from('sequences')
    .insert({
      name: 'Default Dunning Sequence',
      description: 'Polite, relationship-preserving 3-step recovery sequence',
      profile_id: profileId,
      is_default: true,
      is_active: true,
    })
    .select('id')
    .single()

  if (seqError || !seq) {
    console.error('[DemoMigrate] Sequence create error:', seqError)
    return null
  }

  // Seed all 3 default steps
  const steps = DEFAULT_TEMPLATES.map((t) => ({
    sequence_id: seq.id,
    step_number: t.stepNumber,
    delay_days: t.delayDays,
    email_subject: t.emailSubject,
    email_body: t.emailBody,
  }))

  const { error: stepError } = await supabase
    .from('sequence_steps')
    .insert(steps)

  if (stepError) {
    console.error('[DemoMigrate] Steps insert error:', stepError)
    // Clean up the orphaned sequence
    await supabase.from('sequences').delete().eq('id', seq.id)
    return null
  }

  return seq.id
}

/**
 * Run the full demo-to-real migration for a newly registered user.
 *
 * 1. Checks for the demo cookie
 * 2. Seeds the default dunning sequence
 * 3. Returns the migration result
 *
 * Safe to call even when there's no demo cookie — just returns
 * `{ migrated: false }`.
 */
export async function migrateFromDemo(
  request: Request,
  profileId: string,
): Promise<{ migrated: boolean; sequenceId?: string }> {
  if (!isDemoSession(request)) {
    return { migrated: false }
  }

  console.log('[DemoMigrate] Demo cookie detected — seeding default sequence for', profileId)

  const sequenceId = await seedDefaultSequence(profileId)
  if (!sequenceId) {
    return { migrated: false }
  }

  console.log('[DemoMigrate] Migration complete. Sequence:', sequenceId)
  return { migrated: true, sequenceId }
}