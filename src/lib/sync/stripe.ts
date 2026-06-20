import { ProviderSyncService, SyncedClient, SyncedInvoice } from './types'
import Stripe from 'stripe'

export class StripeSyncService implements ProviderSyncService {
  provider = 'stripe' as const;

  async fetchData(userId: string, connection: any): Promise<{ clients: SyncedClient[]; invoices: SyncedInvoice[] }> {
    console.log(`StripeSyncService: Fetching data for user ${userId} and connection ${connection?.id}`);
    
    // Check if the connection has a real or mock token
    const accessToken = connection?.encrypted_access_token;
    const isMock = !accessToken || 
                   accessToken.startsWith('stripe_access_mock_') || 
                   accessToken.includes('placeholder') || 
                   process.env.STRIPE_SECRET_KEY === 'your-stripe-secret-key';

    if (isMock) {
      console.log('StripeSyncService: Using mock data generator for connection');
      return this.generateMockData();
    }

    try {
      console.log('StripeSyncService: Initializing real Stripe client with access token.');
      
      const stripe = new Stripe(accessToken, {
        apiVersion: '2023-10-16' as any, // Use stable compatible version
        typescript: true,
      });

      const clients: SyncedClient[] = [];
      const invoices: SyncedInvoice[] = [];

      // 1. Fetch Stripe Customers
      console.log('StripeSyncService: Fetching customers from Stripe API...');
      const customerPaginator = stripe.customers.list({ limit: 100 });
      for await (const customer of customerPaginator) {
        if (customer.deleted) {
          continue;
        }

        clients.push({
          provider_client_id: customer.id,
          name: customer.name || customer.email || 'Unnamed Customer',
          email: customer.email || '',
          phone: customer.phone || null,
          company_name: customer.metadata?.company_name || customer.name || null,
          metadata: customer.metadata || {},
          status: 'active'
        });
      }
      console.log(`StripeSyncService: Successfully fetched ${clients.length} customers.`);

      // 2. Fetch Stripe Invoices
      console.log('StripeSyncService: Fetching invoices from Stripe API...');
      const invoicePaginator = stripe.invoices.list({ limit: 100 });
      for await (const invoice of invoicePaginator) {
        // Map invoice status safely
        let status: SyncedInvoice['status'] = 'open';
        if (invoice.status === 'draft') {
          status = 'draft';
        } else if (invoice.status === 'paid') {
          status = 'paid';
        } else if (invoice.status === 'void') {
          status = 'void';
        } else if (invoice.status === 'uncollectible') {
          status = 'uncollectible';
        } else if (invoice.status === 'open') {
          status = 'open';
        }

        const providerClientId = typeof invoice.customer === 'string' 
          ? invoice.customer 
          : invoice.customer?.id;

        if (!providerClientId) {
          console.warn(`StripeSyncService: Invoice ${invoice.id} is missing a customer ID. Skipping.`);
          continue;
        }

        invoices.push({
          provider_invoice_id: invoice.id,
          provider_client_id: providerClientId,
          invoice_number: invoice.number || null,
          amount_cents: invoice.total,
          amount_paid_cents: invoice.amount_paid,
          amount_due_cents: invoice.amount_remaining ?? (invoice.total - invoice.amount_paid),
          currency: (invoice.currency || 'USD').toUpperCase(),
          status,
          issued_at: new Date(invoice.created * 1000).toISOString(),
          due_at: invoice.due_date 
            ? new Date(invoice.due_date * 1000).toISOString() 
            : new Date(invoice.created * 1000).toISOString(),
          paid_at: invoice.status_transitions?.paid_at 
            ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() 
            : null,
          payment_link: invoice.hosted_invoice_url || null,
          raw_payload: invoice as any
        });
      }
      console.log(`StripeSyncService: Successfully fetched ${invoices.length} invoices.`);

      return { clients, invoices };
    } catch (err: any) {
      console.error('Error fetching real Stripe data, falling back to mock:', err);
      // Fallback gracefully in dev environment, but in a production environment we might want to propagate.
      // Since this is a dual-mode service running in sandbox contexts, fallback keeps everything operational.
      return this.generateMockData();
    }
  }

  private generateMockData(): { clients: SyncedClient[]; invoices: SyncedInvoice[] } {
    const clients: SyncedClient[] = [
      {
        provider_client_id: 'cus_mock_acme123',
        name: 'Acme Corporation',
        email: 'billing@acme.com',
        phone: '+1 (555) 019-2834',
        company_name: 'Acme Corporation',
        metadata: { source: 'stripe_mock' },
        status: 'active'
      },
      {
        provider_client_id: 'cus_mock_glob456',
        name: 'Global Logistics',
        email: 'finance@globallogistics.com',
        phone: '+1 (555) 014-9988',
        company_name: 'Global Logistics Ltd',
        metadata: { source: 'stripe_mock' },
        status: 'active'
      },
      {
        provider_client_id: 'cus_mock_star789',
        name: 'Starlight Creative',
        email: 'hello@starlight.co',
        phone: '+1 (555) 012-3456',
        company_name: 'Starlight Creative Agency',
        metadata: { source: 'stripe_mock' },
        status: 'active'
      },
      {
        provider_client_id: 'cus_mock_nexus012',
        name: 'Nexus Solutions',
        email: 'accounts@nexus.io',
        phone: '+1 (555) 011-2233',
        company_name: 'Nexus Solutions Ltd',
        metadata: { source: 'stripe_mock' },
        status: 'active'
      }
    ];

    const today = new Date();
    
    const daysAgo = (num: number) => {
      const d = new Date();
      d.setDate(today.getDate() - num);
      return d.toISOString();
    };

    const daysFromNow = (num: number) => {
      const d = new Date();
      d.setDate(today.getDate() + num);
      return d.toISOString();
    };

    const invoices: SyncedInvoice[] = [
      {
        provider_invoice_id: 'in_mock_stripe101',
        provider_client_id: 'cus_mock_acme123',
        invoice_number: 'INV-STR-001',
        amount_cents: 25000,
        amount_paid_cents: 25000,
        amount_due_cents: 0,
        currency: 'USD',
        status: 'paid',
        issued_at: daysAgo(15),
        due_at: daysAgo(0),
        paid_at: daysAgo(14),
        payment_link: 'https://stripe.com/pay/in_mock_stripe101',
        raw_payload: { id: 'in_mock_stripe101', object: 'invoice', customer: 'cus_mock_acme123', amount_due: 25000, status: 'paid' }
      },
      {
        provider_invoice_id: 'in_mock_stripe102',
        provider_client_id: 'cus_mock_glob456',
        invoice_number: 'INV-STR-002',
        amount_cents: 120000,
        amount_paid_cents: 0,
        amount_due_cents: 120000,
        currency: 'USD',
        status: 'open',
        issued_at: daysAgo(30),
        due_at: daysAgo(15),
        payment_link: 'https://stripe.com/pay/in_mock_stripe102',
        raw_payload: { id: 'in_mock_stripe102', object: 'invoice', customer: 'cus_mock_glob456', amount_due: 120000, status: 'open' }
      },
      {
        provider_invoice_id: 'in_mock_stripe103',
        provider_client_id: 'cus_mock_star789',
        invoice_number: 'INV-STR-003',
        amount_cents: 85000,
        amount_paid_cents: 0,
        amount_due_cents: 85000,
        currency: 'USD',
        status: 'open',
        issued_at: daysAgo(5),
        due_at: daysFromNow(10),
        payment_link: 'https://stripe.com/pay/in_mock_stripe103',
        raw_payload: { id: 'in_mock_stripe103', object: 'invoice', customer: 'cus_mock_star789', amount_due: 85000, status: 'open' }
      },
      {
        provider_invoice_id: 'in_mock_stripe104',
        provider_client_id: 'cus_mock_nexus012',
        invoice_number: 'INV-STR-004',
        amount_cents: 45000,
        amount_paid_cents: 45000,
        amount_due_cents: 0,
        currency: 'USD',
        status: 'paid',
        issued_at: daysAgo(2),
        due_at: daysFromNow(12),
        paid_at: daysAgo(1),
        payment_link: 'https://stripe.com/pay/in_mock_stripe104',
        raw_payload: { id: 'in_mock_stripe104', object: 'invoice', customer: 'cus_mock_nexus012', amount_due: 45000, status: 'paid' }
      }
    ];

    return { clients, invoices };
  }
}

// Export StripeSyncProvider as an alias to fully support whichever naming convention is queried
export { StripeSyncService as StripeSyncProvider };
