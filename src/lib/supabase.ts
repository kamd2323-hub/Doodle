import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your-supabase-url'
  ? process.env.NEXT_PUBLIC_SUPABASE_URL
  : 'https://placeholder-project.supabase.co'

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your-supabase-anon-key'
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyPlaceholderTokenKey.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTk1OTgsImV4cCI6MjA5NzI5NTk5OH0.dummySignature'

const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url' || 
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder-project.supabase.co')

function createMockQueryBuilder(table: string, options: { isSingle?: boolean } = {}) {
  const chain: any = {
    then: (onfulfilled: any) => {
      let data: any = []
      if (table === 'invoices') {
        data = [
          {
            id: 'mock-inv-1',
            invoice_number: 'INV-2026-001',
            amount_cents: 125000,
            currency: 'usd',
            status: 'unpaid',
            issued_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
            clients: { name: 'Acme Corp' },
            dunning_campaigns: { id: 'mock-camp-1', status: 'active' }
          },
          {
            id: 'mock-inv-2',
            invoice_number: 'INV-2026-002',
            amount_cents: 450000,
            currency: 'usd',
            status: 'paid',
            issued_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
            clients: { name: 'Stark Industries' },
            dunning_campaigns: { id: 'mock-camp-2', status: 'completed' }
          }
        ]
      } else if (table === 'profiles') {
        data = [
          {
            id: 'mock-user-id',
            organization_id: 'mock-org-id',
            name: 'Demo User',
            email: 'test@example.com'
          }
        ]
      } else if (table === 'organizations') {
        data = [
          {
            id: 'mock-org-id',
            name: 'Demo Organization',
            plan_tier: 'standard',
            max_members: 5
          }
        ]
      } else if (table === 'oauth_connections') {
        data = [
          {
            provider: 'stripe',
            tenant_name: 'Stripe Live Integration',
            last_synced_at: new Date().toISOString()
          },
          {
            provider: 'quickbooks',
            tenant_name: 'QuickBooks Online Sandbox',
            last_synced_at: new Date().toISOString()
          }
        ]
      } else if (table === 'sequences') {
        data = [
          {
            id: 'mock-seq-1',
            name: 'Standard Collections Sequence',
            description: 'Gentle, professional dunning email sequence designed for freelance collections.',
            is_default: true,
            is_active: true,
            created_at: new Date().toISOString()
          }
        ]
      } else if (table === 'sequence_steps') {
        data = [
          {
            id: 'mock-step-1',
            sequence_id: 'mock-seq-1',
            step_number: 1,
            delay_days: 1,
            email_subject: 'Invoice {{invoice_number}} is due',
            email_body: 'Hi {{customer_name}}, the invoice {{invoice_number}} for {{amount_due}} is due today. Please make payment.'
          },
          {
            id: 'mock-step-2',
            sequence_id: 'mock-seq-1',
            step_number: 2,
            delay_days: 3,
            email_subject: 'Reminder: Invoice {{invoice_number}}',
            email_body: 'Hi {{customer_name}}, this is a quick reminder that invoice {{invoice_number}} is overdue.'
          }
        ]
      }
      
      const result = options.isSingle ? (data[0] || null) : data
      return Promise.resolve(onfulfilled({ data: result, error: null }))
    }
  }

  return new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') {
        return target.then
      }
      if (prop === 'single') {
        return () => createMockQueryBuilder(table, { isSingle: true })
      }
      return () => createMockQueryBuilder(table, options)
    }
  })
}

const mockSupabaseClient = {
  auth: {
    signUp: async ({ email }: { email: string }) => {
      if (typeof window !== 'undefined') {
        document.cookie = `mock_user_email=${encodeURIComponent(email)}; path=/`
      }
      return { data: { user: { id: 'mock-user-id', email } }, error: null }
    },
    signInWithPassword: async ({ email }: { email: string }) => {
      if (typeof window !== 'undefined') {
        document.cookie = `mock_user_email=${encodeURIComponent(email)}; path=/`
      }
      return { data: { user: { id: 'mock-user-id', email } }, error: null }
    },
    signOut: async () => {
      if (typeof window !== 'undefined') {
        document.cookie = 'mock_user_email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      }
      return { error: null }
    },
    getUser: async () => {
      let email = 'test@example.com'
      if (typeof window !== 'undefined') {
        const match = document.cookie.match(/(?:^|; )mock_user_email=([^;]*)/)
        if (match) email = decodeURIComponent(match[1])
      }
      return { data: { user: { id: 'mock-user-id', email } }, error: null }
    },
    getSession: async () => {
      let email = 'test@example.com'
      if (typeof window !== 'undefined') {
        const match = document.cookie.match(/(?:^|; )mock_user_email=([^;]*)/)
        if (match) email = decodeURIComponent(match[1])
      }
      return {
        data: {
          session: {
            user: { id: 'mock-user-id', email },
            access_token: 'mock-token'
          }
        },
        error: null
      }
    },
    onAuthStateChange: (callback: any) => {
      setTimeout(() => {
        let email = 'test@example.com'
        if (typeof window !== 'undefined') {
          const match = document.cookie.match(/(?:^|; )mock_user_email=([^;]*)/)
          if (match) email = decodeURIComponent(match[1])
        }
        callback('SIGNED_IN', { user: { id: 'mock-user-id', email } })
      }, 0)
      return { data: { subscription: { unsubscribe: () => {} } } }
    }
  },
  from: (table: string) => createMockQueryBuilder(table),
  channel: (name: string) => {
    const mockChannel = {
      on: (event: string, filter: any, callback: any) => {
        return mockChannel
      },
      subscribe: () => {
        return mockChannel
      }
    }
    return mockChannel
  },
  removeChannel: (channel: any) => {},
}

export function createClient() {
  if (isMockMode) {
    return mockSupabaseClient as any
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
