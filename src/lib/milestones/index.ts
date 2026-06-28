import { Resend } from 'resend';
import { createClient } from '@/lib/supabase-server';

// Owner email for milestone notifications
const OWNER_EMAIL = 'kamd2323@gmail.com';

// Milestone thresholds in cents
const MILESTONES = [
  { cents: 10000, label: '$100', key: 'milestone_100' },
  { cents: 50000, label: '$500', key: 'milestone_500' },
  { cents: 100000, label: '$1,000', key: 'milestone_1000' },
];

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Calculates the total recovered amount across all profiles.
 */
export async function getTotalRecoveredCents(): Promise<number> {
  const supabase = await createClient();
  
  const { data: recoveries, error } = await supabase
    .from('recoveries')
    .select('amount_recovered_cents');

  if (error) {
    console.error('[Milestones] Failed to fetch recoveries:', error);
    return 0;
  }

  return recoveries?.reduce((sum, r) => sum + Number(r.amount_recovered_cents), 0) || 0;
}

/**
 * Returns all milestones that have been reached but not yet notified.
 * Compares total recovered against the milestone thresholds.
 */
export async function getUnnotifiedMilestones(totalCents: number): Promise<typeof MILESTONES> {
  const supabase = await createClient();
  
  const { data: notified } = await supabase
    .from('recovery_milestones')
    .select('milestone_key');

  const notifiedKeys = new Set(notified?.map(n => n.milestone_key) || []);

  return MILESTONES.filter(
    m => totalCents >= m.cents && !notifiedKeys.has(m.key)
  );
}

/**
 * Sends milestone notification email to the owner.
 */
async function sendMilestoneEmail(milestone: typeof MILESTONES[0], totalCents: number): Promise<boolean> {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalCents / 100);

  try {
    const { data, error } = await resend.emails.send({
      from: 'Reclaim AI <onboarding@resend.dev>',
      to: OWNER_EMAIL,
      subject: `🎉 Reclaim AI Milestone: ${milestone.label} Recovered!`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
            <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Milestone Reached!</h1>
          </div>
          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 12px; padding: 32px; text-align: center; color: white; margin-bottom: 24px;">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 4px;">Total Recovered to Date</div>
            <div style="font-size: 42px; font-weight: bold;">${formatted}</div>
          </div>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 12px 0;">${milestone.label} Milestone Achieved</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0;">
              Your automated invoice recovery through Reclaim AI has reached the <strong>${milestone.label}</strong> milestone!
              The AI-powered dunning campaigns are successfully recovering revenue from past-due invoices.
            </p>
          </div>
          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; border-left: 4px solid #f59e0b;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Next Milestone:</strong> Track your progress toward the next recovery goal.
            </p>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; text-align: center;">
            Sent by Reclaim AI — Automated Invoice Recovery
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[Milestones] Failed to send notification email:', error);
      return false;
    }

    console.log(`[Milestones] Sent milestone notification: ${milestone.label}, MessageID: ${data?.id}`);
    return true;
  } catch (err) {
    console.error('[Milestones] Error sending milestone email:', err);
    return false;
  }
}

/**
 * Core function: Checks the current total recovered amount, identifies any new
 * milestones reached, sends notification emails, and records the notification
 * in the database to prevent duplicate alerts.
 * 
 * Designed to be called periodically (e.g., via a cron job or after each recovery event).
 */
export async function checkAndNotifyMilestones(): Promise<{
  checked: boolean;
  totalCents: number;
  milestonesNotified: string[];
  errors: string[];
}> {
  const result = {
    checked: true,
    totalCents: 0,
    milestonesNotified: [] as string[],
    errors: [] as string[],
  };

  try {
    const totalCents = await getTotalRecoveredCents();
    result.totalCents = totalCents;

    const unnotified = await getUnnotifiedMilestones(totalCents);

    if (unnotified.length === 0) {
      console.log(`[Milestones] Total recovered: $${(totalCents / 100).toFixed(2)}. No new milestones to notify.`);
      return result;
    }

    const supabase = await createClient();

    for (const milestone of unnotified) {
      const emailSent = await sendMilestoneEmail(milestone, totalCents);

      // Record milestone in DB regardless of email status to avoid re-sending attempts
      const { error: insertError } = await supabase
        .from('recovery_milestones')
        .insert({
          milestone_key: milestone.key,
          milestone_label: milestone.label,
          threshold_cents: milestone.cents,
          total_recovered_cents_at_milestone: totalCents,
          email_sent: emailSent,
          notified_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error(`[Milestones] Failed to record milestone ${milestone.key}:`, insertError);
        result.errors.push(`Failed to record milestone ${milestone.key}: ${insertError.message}`);
      } else {
        result.milestonesNotified.push(milestone.key);
        console.log(`[Milestones] Successfully notified milestone: ${milestone.label} (Total: $${(totalCents / 100).toFixed(2)})`);
      }
    }

    return result;
  } catch (err: any) {
    console.error('[Milestones] Fatal error checking milestones:', err);
    result.errors.push(err.message || String(err));
    return result;
  }
}