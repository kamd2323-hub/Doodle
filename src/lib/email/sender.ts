import { Resend } from 'resend';
import { createClient } from '@/lib/supabase-server';

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendDunningEmailParams {
  profileId: string;
  invoiceId: string;
  to: string;
  subject: string;
  body: string;
}

/**
 * Sends a dunning email using Resend and logs the result in the database.
 * 
 * @param params {SendDunningEmailParams} - The email details
 * @returns {Promise<{ success: boolean; messageId?: string; error?: any }>}
 */
export async function sendDunningEmail({
  profileId,
  invoiceId,
  to,
  subject,
  body,
}: SendDunningEmailParams) {
  const supabase = await createClient();

  // Determine the 'from' address. 
  // Note: In production, this should be a verified domain.
  const fromEmail = process.env.FROM_EMAIL || 'Reclaim AI <onboarding@resend.dev>';

  try {
    // 1. Send the email via Resend
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: body,
    });

    if (error) {
      console.error('Resend email dispatch error:', error);
      
      // Log the failure in the database
      await supabase
        .from('dunning_email_logs')
        .insert({
          profile_id: profileId,
          invoice_id: invoiceId,
          recipient_email: to,
          sent_subject: subject,
          sent_body: body,
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
        profile_id: profileId,
        invoice_id: invoiceId,
        recipient_email: to,
        sent_subject: subject,
        sent_body: body,
        status: 'sent',
        sent_at: new Date().toISOString(),
        resend_id: data?.id,
      });

    if (logError) {
      console.error('Failed to log sent email to Supabase:', logError);
      // We don't return success: false here because the email WAS actually sent.
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('Unexpected error in sendDunningEmail:', err);
    
    // Log unexpected failure
    try {
      await supabase
        .from('dunning_email_logs')
        .insert({
          profile_id: profileId,
          invoice_id: invoiceId,
          recipient_email: to,
          sent_subject: subject,
          sent_body: body,
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
