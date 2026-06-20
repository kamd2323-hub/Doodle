import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { syncAll } from '@/lib/sync';
import { autoResolvePaidCampaigns, handleInvoicePaid } from '@/lib/dunning/processor';
import * as crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('intuit-signature');
    const verifierToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN;

    // 1. Signature Verification for Intuit webhooks
    if (verifierToken && verifierToken !== 'your-qbo-webhook-verifier-token' && signature) {
      const hash = crypto
        .createHmac('sha256', verifierToken)
        .update(rawBody)
        .digest('base64');

      if (hash !== signature) {
        console.error('[QBOWebhook] Signature verification failed');
        return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    console.log('[QBOWebhook] Received QBO event payload:', JSON.stringify(payload));

    const notifications = payload.eventNotifications || [];
    let invoicesToProcess: { realmId: string; invoiceId: string }[] = [];

    // 2. Parse payload for any Invoice changes
    for (const notification of notifications) {
      const realmId = notification.realmId;
      const entities = notification.dataChangeEvent?.entities || [];

      for (const entity of entities) {
        if (entity.name === 'Invoice') {
          invoicesToProcess.push({
            realmId,
            invoiceId: entity.id
          });
        }
      }
    }

    if (invoicesToProcess.length === 0) {
      console.log('[QBOWebhook] No invoice entities found in webhook notifications.');
      return NextResponse.json({ received: true, processed: false });
    }

    const supabase = await createClient();
    const processedResults = [];

    // 3. Process each QBO Invoice event
    for (const item of invoicesToProcess) {
      console.log(`[QBOWebhook] Processing change event for QBO invoice ID ${item.invoiceId} on Realm ${item.realmId}`);

      // Locate the user profile / connection associated with this QBO Realm ID
      const { data: connection, error: connectionError } = await supabase
        .from('oauth_connections')
        .select('profile_id')
        .eq('provider', 'quickbooks')
        .eq('tenant_id', item.realmId)
        .maybeSingle();

      if (connectionError || !connection) {
        console.warn(`[QBOWebhook] No active OAuth connection found for realm ${item.realmId}:`, connectionError);
        continue;
      }

      console.log(`[QBOWebhook] Found profile ID ${connection.profile_id} for Realm ${item.realmId}. Triggering provider sync...`);

      // Trigger standard QBO sync to pull down the updated invoice status
      await syncAll(connection.profile_id);

      // Run dunning campaign safety safety-net auto-resolver
      const resolveResult = await autoResolvePaidCampaigns();

      processedResults.push({
        realmId: item.realmId,
        invoiceId: item.invoiceId,
        profileId: connection.profile_id,
        resolved: resolveResult.success,
        resolvedCount: resolveResult.success ? (resolveResult as any).resolvedCount : 0
      });
    }

    return NextResponse.json({
      received: true,
      processed: true,
      results: processedResults
    });
  } catch (error: any) {
    console.error('[QBOWebhook] Critical error processing QuickBooks webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
