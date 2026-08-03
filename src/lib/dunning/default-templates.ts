/**
 * Default dunning email templates for Reclaim AI.
 *
 * Core 3-step sequence (enabled by default): Friendly Reminder (Day 1),
 * Direct Follow-Up (Day 14), and Final Notice (Day 30).
 *
 * Optional Step 1.5 (Day 7 Warm Check-In) — off by default, user opt-in
 * required. Only recommended for high-value retainer/repeat-client
 * relationships. Distinctive format: no greeting, no payment link,
 * no organisation signature, intentionally short (64 words).
 *
 * Templates use {{placeholder}} syntax; the existing personalizeFallback()
 * in src/lib/ai/personalization.ts handles all replacements.
 *
 * Source: /home/team/shared/marketing/dunning-email-templates.md
 */

export interface DefaultTemplate {
  stepNumber: number
  delayDays: number
  emailSubject: string
  emailBody: string
  /** If true, this template is off by default and requires explicit user opt-in. */
  isOptional?: boolean
}

/**
 * Step 1 — Friendly Reminder (Day 1 after due date)
 * Casual, helpful, "maybe you missed this."
 * Most-paid reminder. Resets inbox without alarm.
 */
export const STEP1_FRIENDLY_REMINDER: DefaultTemplate = {
  stepNumber: 1,
  delayDays: 1,
  emailSubject: 'Quick note on invoice {{invoice_number}}',
  emailBody: `Hi {{customer_name}},

Hope you're well. Just a quick heads-up that invoice {{invoice_number}} for {{amount_due}} — originally due {{due_date}} — appears to still be open.

No action needed if it's already on its way; sometimes the notification lag is longer than the email lag, and we just wanted to make sure it didn't get lost in an inbox.

If it's useful, the easiest way to settle it is here:

{{payment_link}}

If anything on our end would make payment easier — a different format, a different billing contact, a wire vs. ACH — just reply and we'll sort it out today.

Thanks,
{{from_name}}
{{organization_name}}`,
}

/**
 * Step 1.5 — Warm Check-In (Day 7 after due date, OPTIONAL)
 *
 * Intentionally a different shape from the other three: no greeting,
 * no payment link, no {{organization_name}} signature — just a short,
 * conversational check-in that feels like a Slack DM from a colleague.
 *
 * OFF BY DEFAULT. Only recommended for high-value retainer/repeat-client
 * relationships where the cost of a Day 30 escalation is genuinely high.
 * Users must explicitly opt in to include this step.
 *
 * Source: marketing doc Section 4.
 */
export const STEP_1_5_TEMPLATE: DefaultTemplate = {
  stepNumber: 1.5,
  delayDays: 7,
  isOptional: true,
  emailSubject: 'Just checking — invoice {{invoice_number}}',
  emailBody: `Hi {{customer_name}},

Just wanted to nudge this one — invoice {{invoice_number}} ({{amount_due}}) is still showing open on my end. I know how easy these things get buried under the next twenty fires.

If something's blocking it on your side, just hit reply and let me know. I'd rather help unstick it than send another formal reminder.

Thanks,
{{from_name}}`,
}

/**
 * Step 2 — Direct Follow-Up (Day 14 after due date)
 * More direct, professional. Names the specific invoice + amount.
 * References prior contact.
 */
export const STEP2_DIRECT_FOLLOWUP: DefaultTemplate = {
  stepNumber: 2,
  delayDays: 14,
  emailSubject: 'Invoice {{invoice_number}} — 14 days past due',
  emailBody: `Hi {{customer_name}},

Following up on invoice {{invoice_number}} for {{amount_due}}, which was due {{due_date}} and is now 14 days past due.

I sent a note about this on [Step 1 send date], but wanted to make sure it didn't get buried under everything else in your inbox. Here's the invoice and the payment link in case it's easier to handle right now:

{{payment_link}}

If something on your end is blocking payment — a billing contact who's changed, an AP system that's flagging the invoice, anything at all — just reply and I'll do what I can to help sort it out. I want this to be the easiest invoice you pay this quarter, not the hardest.

If payment has already been sent, please ignore this — sometimes the notification lag is longer than I'd like.

Thanks,
{{from_name}}
{{organization_name}}`,
}

/**
 * Step 3 — Final Notice (Day 30 after due date)
 * Firm but professional. Clear options: pay now, propose a payment plan,
 * or reply with a date.
 */
export const STEP3_FINAL_NOTICE: DefaultTemplate = {
  stepNumber: 3,
  delayDays: 30,
  emailSubject: 'Invoice {{invoice_number}} — needs to be resolved this week',
  emailBody: `Hi {{customer_name}},

Invoice {{invoice_number}} for {{amount_due}}, originally due {{due_date}}, is now 30 days past due. I want to resolve this quickly, and I'd like to make it as easy as possible.

Three options:

1. Pay the full amount now: {{payment_link}}

2. Reply with a payment date you can commit to in the next 7 days. I'll honor whatever date you give me — no follow-up emails until that date passes.

3. If a payment plan would help, tell me what works. I can split this into two payments over 30 days, no questions asked.

If I don't hear back by [date 5 business days from today], I'll have to pause active work on any open project until the invoice is settled. I'd rather not do that — I've valued working with {{company_name}} and I'd like to keep doing so.

If payment has already been sent, please ignore this — I'll see it on my end.

Thanks,
{{from_name}}
{{organization_name}}`,
}

/**
 * All templates including optional ones (steps 1, 1.5, 2, 3).
 * Use this for lookup — getDefaultTemplate searches this array.
 */
export const ALL_TEMPLATES: DefaultTemplate[] = [
  STEP1_FRIENDLY_REMINDER,
  STEP_1_5_TEMPLATE,
  STEP2_DIRECT_FOLLOWUP,
  STEP3_FINAL_NOTICE,
]

/**
 * Default (non-optional) templates only: steps 1, 2, 3.
 * This is what gets seeded when a user creates a "Default Sequence."
 * Step 1.5 is excluded — user must opt in explicitly.
 */
export const DEFAULT_TEMPLATES: DefaultTemplate[] = ALL_TEMPLATES.filter(
  t => !t.isOptional,
)

/**
 * Optional templates that users can explicitly add.
 * Currently just Step 1.5 (Day 7 Warm Check-In).
 */
export const OPTIONAL_TEMPLATES: DefaultTemplate[] = ALL_TEMPLATES.filter(
  t => t.isOptional,
)

/**
 * Get the template for a given step number (1, 1.5, 2, or 3).
 * Searches ALL_TEMPLATES so optional steps are findable.
 * Returns null if the step number has no template.
 */
export function getDefaultTemplate(stepNumber: number): DefaultTemplate | null {
  return ALL_TEMPLATES.find(t => t.stepNumber === stepNumber) || null
}

/**
 * Get the email subject, body, delay, and optional flag for a given step.
 * Convenience for pre-filling a new step form.
 */
export function getDefaultStepFields(stepNumber: number): {
  emailSubject: string
  emailBody: string
  delayDays: number
  isOptional: boolean
} {
  const template = getDefaultTemplate(stepNumber)
  return {
    emailSubject: template?.emailSubject || '',
    emailBody: template?.emailBody || '',
    delayDays: template?.delayDays || 1,
    isOptional: template?.isOptional || false,
  }
}
