import { createClient } from '@/lib/supabase-server';
import { personalizeEmail } from '@/lib/ai/personalization';
import { sendDunningEmail } from '@/lib/email';
import { checkAndNotifyMilestones } from '@/lib/milestones';

export interface ProcessResult {
  successCount: number;
  failedCount: number;
  campaignsProcessed: Array<{
    campaignId: string;
    invoiceNumber: string | null;
    status: string;
    details?: string;
  }>;
}

/**
 * Periodically processes active dunning campaigns that are due for their next step.
 * 
 * This function retrieves all active campaigns where `next_action_at` is less than or equal to now.
 * It uses atomic row updates (leasing locks) to prevent duplicate processing/email sends in concurrent environments.
 * 
 * @returns {Promise<ProcessResult>} Summary of the processing run
 */
export async function processDunningCampaigns(): Promise<ProcessResult> {
  const supabase = await createClient();
  const now = new Date();
  const nowIso = now.toISOString();

  console.log(`[DunningProcessor] Starting campaign processing run at ${nowIso}`);

  const result: ProcessResult = {
    successCount: 0,
    failedCount: 0,
    campaignsProcessed: [],
  };

  // 1. Query for active campaigns that are due or overdue for their next action
  // We fetch associated invoice, client and sequence details to perform personalization
  const { data: campaigns, error: queryError } = await supabase
    .from('dunning_campaigns')
    .select(`
      id,
      profile_id,
      invoice_id,
      sequence_id,
      status,
      last_step_number,
      last_communication_at,
      next_action_at,
      profile:profiles (
        organization_name,
        logo_url,
        default_from_name,
        global_tone_preference
      ),
      invoice:invoices (
        id,
        invoice_number,
        amount_due_cents,
        currency,
        due_at,
        payment_link,
        client:clients (
          id,
          name,
          email,
          phone,
          company_name
        )
      ),
      sequence:sequences (
        id,
        sequence_steps (
          id,
          step_number,
          delay_days,
          email_subject,
          email_body
        )
      )
    `)
    .eq('status', 'active')
    .lte('next_action_at', nowIso);

  if (queryError) {
    console.error('[DunningProcessor] Failed to fetch active campaigns:', queryError);
    throw queryError;
  }

  if (!campaigns || campaigns.length === 0) {
    console.log('[DunningProcessor] No campaigns due for processing at this time.');
    return result;
  }

  console.log(`[DunningProcessor] Found ${campaigns.length} candidate campaigns due for processing.`);

  for (const campaign of campaigns) {
    const castCampaign = campaign as any;
    const invoice = castCampaign.invoice;
    const sequence = castCampaign.sequence;
    const branding = castCampaign.profile;

    if (!invoice || !invoice.client) {
      console.warn(`[DunningProcessor] Campaign ${castCampaign.id} lacks valid invoice or client data. Skipping.`);
      result.failedCount++;
      result.campaignsProcessed.push({
        campaignId: castCampaign.id,
        invoiceNumber: invoice?.invoice_number || null,
        status: 'skipped',
        details: 'Missing invoice or client relations data',
      });
      continue;
    }

    if (!sequence || !sequence.sequence_steps || sequence.sequence_steps.length === 0) {
      console.warn(`[DunningProcessor] Campaign ${castCampaign.id} lacks sequence steps. Skipping.`);
      result.failedCount++;
      result.campaignsProcessed.push({
        campaignId: castCampaign.id,
        invoiceNumber: invoice.invoice_number,
        status: 'skipped',
        details: 'No sequence steps found for sequence ' + castCampaign.sequence_id,
      });
      continue;
    }

    // 2. Pessimistic Locking / Leased Lock Mechanism
    // To prevent duplicate sends if multiple processors run concurrently,
    // we atomically update next_action_at to a "lease time" in the future (e.g., +10 minutes).
    // The query relies on the condition next_action_at <= now, so once updated, other workers won't pick it up.
    const leaseTime = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const { data: lockAcquired, error: lockError } = await supabase
      .from('dunning_campaigns')
      .update({ next_action_at: leaseTime })
      .eq('id', castCampaign.id)
      .eq('status', 'active')
      .lte('next_action_at', nowIso)
      .select();

    if (lockError || !lockAcquired || lockAcquired.length === 0) {
      console.log(`[DunningProcessor] Lease lock not acquired for campaign ${castCampaign.id}. It was likely picked up by another worker or modified.`);
      continue; // Skip silently as another worker is already processing it
    }

    try {
      const nextStepNumber = castCampaign.last_step_number + 1;
      const nextStep = sequence.sequence_steps.find((step: any) => step.step_number === nextStepNumber);

      // 3. Sequence Exhaustion Check
      if (!nextStep) {
        console.log(`[DunningProcessor] Campaign ${castCampaign.id} has completed all steps in sequence ${castCampaign.sequence_id}. Marking as completed.`);
        
        await supabase
          .from('dunning_campaigns')
          .update({
            status: 'completed',
            next_action_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', castCampaign.id);

        result.successCount++;
        result.campaignsProcessed.push({
          campaignId: castCampaign.id,
          invoiceNumber: invoice.invoice_number,
          status: 'completed',
          details: 'Sequence steps exhausted',
        });
        continue;
      }

      console.log(`[DunningProcessor] Processing campaign ${castCampaign.id}, Step #${nextStepNumber} (Delay: ${nextStep.delay_days} days)`);

      // 4. Use AI Template Engine to Personalize the Email
      const template = {
        email_subject: nextStep.email_subject,
        email_body: nextStep.email_body,
      };

      const invoiceData = {
        invoice_number: invoice.invoice_number,
        amount_due_cents: Number(invoice.amount_due_cents),
        currency: invoice.currency,
        due_at: invoice.due_at,
        payment_link: invoice.payment_link,
      };

      const clientData = {
        name: invoice.client.name,
        email: invoice.client.email,
        phone: invoice.client.phone,
        company_name: invoice.client.company_name,
      };

      const brandingData = {
        organization_name: branding?.organization_name,
        logo_url: branding?.logo_url,
        default_from_name: branding?.default_from_name,
        global_tone_preference: branding?.global_tone_preference,
      };

      const personalized = await personalizeEmail(template, invoiceData, clientData, brandingData);

      // 5. Dispatch the email via our Outbound Email Service
      const sendResult = await sendDunningEmail({
        campaignId: castCampaign.id,
        stepId: nextStep.id,
        invoiceId: invoice.id,
        to: clientData.email,
        subject: personalized.subject,
        body: personalized.body,
      });

      if (!sendResult.success) {
        console.error(`[DunningProcessor] Failed to dispatch email for campaign ${castCampaign.id}:`, sendResult.error);
        
        // Release the lease lock by restoring the original next_action_at (or retry soon)
        await supabase
          .from('dunning_campaigns')
          .update({
            next_action_at: castCampaign.next_action_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', castCampaign.id);

        result.failedCount++;
        result.campaignsProcessed.push({
          campaignId: castCampaign.id,
          invoiceNumber: invoice.invoice_number,
          status: 'failed',
          details: `Email dispatch failed: ${(sendResult.error as any)?.message || 'Unknown error'}`,
        });
        continue;
      }

      // 6. Calculate the next action time
      // Delay delay_days wait time: 
      // - Step 1: Wait delay_days after the invoice due date.
      // - Step > 1: Wait delay_days after current execution time.
      const communicationTime = new Date();
      let nextActionDate = new Date();

      if (nextStep.step_number === 1) {
        const invoiceDueDate = new Date(invoice.due_at);
        invoiceDueDate.setDate(invoiceDueDate.getDate() + nextStep.delay_days);
        nextActionDate = invoiceDueDate;
        
        // If calculated date has already passed, set it to trigger in the next interval (e.g., in 1 day) or immediately
        if (nextActionDate <= now) {
          // If invoice is already very overdue, schedule the next step for delay_days from now
          nextActionDate = new Date();
          nextActionDate.setDate(nextActionDate.getDate() + nextStep.delay_days);
        }
      } else {
        nextActionDate.setDate(nextActionDate.getDate() + nextStep.delay_days);
      }

      // 7. Update Campaign Status, Last Communication, and Next Action At
      const { error: updateError } = await supabase
        .from('dunning_campaigns')
        .update({
          last_step_number: nextStep.step_number,
          current_step_id: nextStep.id,
          last_communication_at: communicationTime.toISOString(),
          next_action_at: nextActionDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', castCampaign.id);

      if (updateError) {
        console.error(`[DunningProcessor] Critical: Email was sent but failed to update campaign status in database for ${castCampaign.id}:`, updateError);
        // Do not fail the run as the email was successfully sent
      }

      result.successCount++;
      result.campaignsProcessed.push({
        campaignId: castCampaign.id,
        invoiceNumber: invoice.invoice_number,
        status: 'success',
        details: `Sent Step #${nextStepNumber}, scheduled next action for ${nextActionDate.toISOString()}`,
      });

    } catch (processError: any) {
      console.error(`[DunningProcessor] Unexpected error processing campaign ${castCampaign.id}:`, processError);
      
      // Attempt to release lock so it can be retried later
      try {
        await supabase
          .from('dunning_campaigns')
          .update({
            next_action_at: castCampaign.next_action_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', castCampaign.id);
      } catch (lockReleaseError) {
        console.error(`[DunningProcessor] Failed to release lease lock for campaign ${castCampaign.id}:`, lockReleaseError);
      }

      result.failedCount++;
      result.campaignsProcessed.push({
        campaignId: castCampaign.id,
        invoiceNumber: invoice.invoice_number,
        status: 'error',
        details: processError.message || String(processError),
      });
    }
  }

  console.log(`[DunningProcessor] Completed campaign processing run. Success: ${result.successCount}, Failed: ${result.failedCount}`);
  return result;
}

/**
 * Automatically stops any active dunning campaigns for an invoice when a payment is received,
 * updates the invoice status to 'paid', and logs a recovery record.
 * 
 * @param provider {'stripe' | 'quickbooks'} - The payment provider
 * @param providerInvoiceId {string} - The provider's invoice identifier
 * @param transactionId {string} - Optional transaction or payment intent/charge ID
 * @param amountPaidCents {number} - Optional amount paid in cents
 */
export async function handleInvoicePaid(
  provider: 'stripe' | 'quickbooks',
  providerInvoiceId: string,
  transactionId?: string,
  amountPaidCents?: number
) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  console.log(`[WebhookHandler] Processing payment for ${provider} invoice ${providerInvoiceId}`);

  // 1. Find the invoice in the database
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('provider', provider)
    .eq('provider_invoice_id', providerInvoiceId)
    .single();

  if (invoiceError || !invoice) {
    console.error(`[WebhookHandler] Invoice not found for ${provider} id ${providerInvoiceId}:`, invoiceError);
    return { success: false, error: 'Invoice not found' };
  }

  // 2. Update the invoice status in the database to 'paid'
  const paidCents = amountPaidCents !== undefined ? amountPaidCents : invoice.amount_due_cents;
  const { error: updateInvoiceError } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      amount_paid_cents: paidCents,
      amount_due_cents: 0,
      paid_at: now,
      updated_at: now,
    })
    .eq('id', invoice.id);

  if (updateInvoiceError) {
    console.error(`[WebhookHandler] Failed to update invoice ${invoice.id} to paid:`, updateInvoiceError);
  }

  // 3. Find any active dunning campaign associated with this invoice
  const { data: campaign, error: campaignError } = await supabase
    .from('dunning_campaigns')
    .select('*')
    .eq('invoice_id', invoice.id)
    .eq('status', 'active')
    .single();

  if (campaignError || !campaign) {
    console.log(`[WebhookHandler] No active dunning campaign found for invoice ${invoice.id}. No dunning to stop.`);
    return { success: true, details: 'Invoice updated to paid, no active campaign was running' };
  }

  // 4. Mark the campaign as 'recovered' and disable future actions
  const { error: updateCampaignError } = await supabase
    .from('dunning_campaigns')
    .update({
      status: 'recovered',
      next_action_at: null,
      updated_at: now,
    })
    .eq('id', campaign.id);

  if (updateCampaignError) {
    console.error(`[WebhookHandler] Failed to mark campaign ${campaign.id} as recovered:`, updateCampaignError);
  }

  // 5. Log the recovery event in the recoveries table
  const { error: recoveryError } = await supabase
    .from('recoveries')
    .insert({
      profile_id: campaign.profile_id,
      invoice_id: invoice.id,
      campaign_id: campaign.id,
      amount_recovered_cents: paidCents,
      currency: invoice.currency || 'USD',
      payment_provider: provider,
      transaction_id: transactionId || null,
      recovered_at: now,
    });

  if (recoveryError) {
    console.error(`[WebhookHandler] Failed to log recovery for campaign ${campaign.id}:`, recoveryError);
  }

  // Check and notify milestones after successful recovery
  try {
    await checkAndNotifyMilestones();
  } catch (milestoneErr) {
    console.error(`[WebhookHandler] Milestone check failed (non-critical):`, milestoneErr);
  }

  console.log(`[WebhookHandler] Successfully stopped dunning campaign ${campaign.id} and recorded recovery for invoice ${invoice.id}.`);
  return { success: true, campaignId: campaign.id, invoiceId: invoice.id };
}

/**
 * Scans for any active dunning campaigns where the associated invoice has been marked as 'paid',
 * and resolves/stops those campaigns and logs the recovery. This handles cases where invoices
 * are updated to 'paid' via sync engine runs or manual updates rather than direct webhooks.
 */
export async function autoResolvePaidCampaigns() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  console.log('[DunningProcessor] Running auto-resolve for paid campaigns...');

  // 1. Get all active campaigns and join with their invoices
  const { data: activeCampaigns, error } = await supabase
    .from('dunning_campaigns')
    .select(`
      id,
      profile_id,
      invoice_id,
      invoices!inner (
        id,
        status,
        amount_paid_cents,
        amount_due_cents,
        currency,
        provider,
        provider_invoice_id
      )
    `)
    .eq('status', 'active');

  if (error) {
    console.error('[DunningProcessor] Failed to fetch active campaigns for auto-resolve:', error);
    return { success: false, error };
  }

  let resolvedCount = 0;

  for (const campaign of (activeCampaigns || [])) {
    const invoice = campaign.invoices as any;
    if (invoice && (invoice.status === 'paid' || invoice.amount_due_cents <= 0)) {
      console.log(`[DunningProcessor] Campaign ${campaign.id} has paid invoice ${invoice.id}. Auto-resolving...`);

      // Mark the campaign as 'recovered' and disable future actions
      await supabase
        .from('dunning_campaigns')
        .update({
          status: 'recovered',
          next_action_at: null,
          updated_at: now,
        })
        .eq('id', campaign.id);

      // Log recovery if not already logged
      const { data: existingRecovery } = await supabase
        .from('recoveries')
        .select('id')
        .eq('campaign_id', campaign.id)
        .maybeSingle();

      if (!existingRecovery) {
        await supabase
          .from('recoveries')
          .insert({
            profile_id: campaign.profile_id,
            invoice_id: invoice.id,
            campaign_id: campaign.id,
            amount_recovered_cents: invoice.amount_paid_cents || 0,
            currency: invoice.currency || 'USD',
            payment_provider: invoice.provider || 'unknown',
            recovered_at: now,
          });
      }

      resolvedCount++;
    }
  }

  if (resolvedCount > 0) {
    // Check milestones if any campaigns were auto-resolved
    try {
      await checkAndNotifyMilestones();
    } catch (milestoneErr) {
      console.error(`[DunningProcessor] Milestone check after auto-resolve failed (non-critical):`, milestoneErr);
    }
  }

  console.log(`[DunningProcessor] Auto-resolve complete. Resolved ${resolvedCount} paid campaigns.`);
  return { success: true, resolvedCount };
}


