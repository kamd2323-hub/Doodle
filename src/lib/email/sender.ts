import { Resend } from 'resend';
import { createClient } from '@/lib/supabase-server';
import { wrapWithBranding, BrandConfig } from '@/lib/email/template';

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendDunningEmailParams {
  campaignId: string;
  stepId: string;
  invoiceId: string;
  to: string;
  subject: string;
  body: string;
}

/**
 * Sends a dunning email using Resend and logs the result in the database.
 * Injects organization branding (logo, colors, sender identity) into the email HTML.
 */
export async function sendDunningEmail({
  campaignId,
  stepId,
  invoiceId,
  to,
  subject,
  body,
}: SendDunningEmailParams) {
  const supabase = await createClient();

  // 0. Fetch branding info from profile associated with the campaign
  const { data: campaignData } = await supabase
    .from('dunning_campaigns')
    .select('profile_id, profile:profiles(organization_name, default_from_name, logo_url)')
    .eq('id', campaignId)
    .single();

  const branding = (campaignData as any)?.profile;
  const fromName = branding?.default_from_name || branding?.organization_name || 'Reclaim AI';

  // Also fetch org-level branding (primary_color, from_email, custom_domain)
  let brandConfig: BrandConfig = {
    organizationName: branding?.organization_name || 'Reclaim AI',
    logoUrl: branding?.logo_url || null,
    fromName,
  };

  // Try to get richer branding from the organization record
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', (campaignData as any)?.profile_id || '')
      .single();

    if (profile?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('primary_color, logo_url, from_name, from_email, custom_domain, domain_status, name')
        .eq('id', profile.organization_id)
        .single();

      if (org) {
        brandConfig = {
          organizationName: org.name || brandConfig.organizationName,
          logoUrl: org.logo_url || brandConfig.logoUrl,
          primaryColor: org.primary_color || undefined,
          fromName: org.from_name || brandConfig.fromName,
          fromEmail: org.from_email || undefined,
          customDomain: org.custom_domain || undefined,
        };

        // Auto-construct from-address from verified custom domain
        if (!org.from_email && org.domain_status === 'verified' && org.custom_domain) {
          const slug = (org.from_name || branding?.organization_name || 'hello')
            .toLowerCase().replace(/[^a-z0-9]/g, '');
          brandConfig.fromEmail = `${slug}@${org.custom_domain}`;
          brandConfig.customDomain = org.custom_domain;
        }
      }
    }
  } catch { /* fall through - use profile-level branding */ }

  // Determine the 'from' address
  const fromAddress = brandConfig.fromEmail || process.env.FROM_EMAIL_ADDRESS || 'onboarding@resend.dev';
  const fromEmail = `${fromName} <${fromAddress}>`;

  // Wrap the email body in branded HTML template
  const brandedBody = wrapWithBranding(body, brandConfig);

  try {
    // 1. Send the email via Resend
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: brandedBody,
    });

    if (error) {
      console.error('Resend email dispatch error:', error);

      // Log the failure in the database
      await supabase
        .from('dunning_email_logs')
        .insert({
          campaign_id: campaignId,
          step_id: stepId,
          invoice_id: invoiceId,
          recipient_email: to,
          sent_subject: subject,
          sent_body: brandedBody,
          status: 'failed',
          error_message: error.message,
          sent_at: new Date().toISOString(),
        });

      return { success: false, error };
    }

    // 2. Log the successful email in dunning_email_logs
    const { error: logError } = await supabase
      .from('dunning_email_logs')
      .insert({
        campaign_id: campaignId,
        step_id: stepId,
        invoice_id: invoiceId,
        recipient_email: to,
        sent_subject: subject,
        sent_body: brandedBody,
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider_message_id: data?.id,
      });

    if (logError) {
      console.error('Failed to log sent email to Supabase:', logError);
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Unexpected error in sendDunningEmail:', err);

    // Log unexpected failure
    try {
      await supabase
        .from('dunning_email_logs')
        .insert({
          campaign_id: campaignId,
          step_id: stepId,
          invoice_id: invoiceId,
          recipient_email: to,
          sent_subject: subject,
          sent_body: brandedBody,
          status: 'failed',
          error_message: err instanceof Error ? err.message : String(err),
          sent_at: new Date().toISOString(),
        });
    } catch (logErr) {
      console.error('Failed to log unexpected error to Supabase:', logErr);
    }

    return { success: false, error: err };
  }
}
