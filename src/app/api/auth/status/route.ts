import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import * as fs from 'fs'

const FALLBACK_FILE_PATH = '/tmp/mock_oauth_connections.json'

export async function GET(request: Request) {
  try {
    let userId = 'mock-user-id'
    let supabase: any = null

    try {
      supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    } catch (e) {
      console.warn('Supabase auth failed in status API, using mock-user-id:', e)
    }

    // Default status
    let stripeConnected = false
    let quickbooksConnected = false
    let stripeTenantName = ''
    let quickbooksTenantName = ''

    // 1. Try to read from Supabase if configured
    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your-supabase-url') {
      try {
        const { data, error } = await supabase
          .from('oauth_connections')
          .select('provider, tenant_name')
          .eq('profile_id', userId)

        if (!error && data) {
          const stripeConn = data.find((conn: any) => conn.provider === 'stripe')
          const qboConn = data.find((conn: any) => conn.provider === 'quickbooks')
          
          if (stripeConn) {
            stripeConnected = true
            stripeTenantName = stripeConn.tenant_name
          }
          if (qboConn) {
            quickbooksConnected = true
            quickbooksTenantName = qboConn.tenant_name
          }
        }
      } catch (err) {
        console.warn('Supabase fetch failed in status API, falling back to local storage:', err)
      }
    }

    // 2. Fallback: Always check the local mock JSON file to merge statuses (highly robust!)
    if (fs.existsSync(FALLBACK_FILE_PATH)) {
      try {
        const fileContent = fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8')
        const connections = JSON.parse(fileContent)
        const userConnections = connections.filter((c: any) => c.profile_id === userId)
        
        const stripeMock = userConnections.find((c: any) => c.provider === 'stripe')
        if (stripeMock) {
          stripeConnected = true
          stripeTenantName = stripeMock.tenant_name || stripeTenantName
        }
        
        const qboMock = userConnections.find((c: any) => c.provider === 'quickbooks')
        if (qboMock) {
          quickbooksConnected = true
          quickbooksTenantName = qboMock.tenant_name || quickbooksTenantName
        }
      } catch (err) {
        console.error('Error reading fallback store in status API:', err)
      }
    }

    return NextResponse.json({
      integrations: {
        stripe: {
          connected: stripeConnected,
          name: 'Stripe',
          tenantName: stripeTenantName,
        },
        quickbooks: {
          connected: quickbooksConnected,
          name: 'QuickBooks Online',
          tenantName: quickbooksTenantName,
        }
      }
    })
  } catch (error: any) {
    console.error('Status route error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
