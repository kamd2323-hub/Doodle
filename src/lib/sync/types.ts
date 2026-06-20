import { SupabaseClient } from '@supabase/supabase-js'

export type ProviderType = 'stripe' | 'quickbooks';

export interface SyncedClient {
  provider_client_id: string; // The ID from the provider (e.g. Stripe cus_xxx, QBO Customer ID)
  name: string;
  email: string;
  phone?: string | null;
  company_name?: string | null;
  metadata?: Record<string, any> | null;
  status?: 'active' | 'archived';
}

export interface SyncedInvoice {
  provider_invoice_id: string; // The ID from the provider (e.g. Stripe in_xxx, QBO Invoice ID)
  provider_client_id: string;  // The customer ID from the provider to link to SyncedClient
  invoice_number?: string | null;
  amount_cents: number;
  amount_paid_cents: number;
  amount_due_cents: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  issued_at: string; // ISO Date String
  due_at: string;    // ISO Date String
  paid_at?: string | null;   // ISO Date String
  payment_link?: string | null;
  raw_payload?: Record<string, any> | null;
}

export interface SyncResult {
  provider: ProviderType;
  success: boolean;
  clientsSynced: number;
  invoicesSynced: number;
  errors?: string[];
}

export interface ProviderSyncService {
  provider: ProviderType;
  /**
   * Fetches clients and invoices from the external provider using connection credentials.
   * Supports generating mock data when in sandbox / local fallback mode.
   */
  fetchData(userId: string, connection: any): Promise<{ clients: SyncedClient[]; invoices: SyncedInvoice[] }>;
}
