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

    // 1. Try to read from Supabase if configured
    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your-supabase-url') {
      try {
        const { data, error } = await supabase
          .from('oauth_connections')
          .select('provider')
          .eq('profile_id', userId)

        if (!error && data) {
          stripeConnected = data.some((conn: any) => conn.provider === 'stripe')
          quickbooksConnected = data.some((conn: any) => conn.provider === 'quickbooks')
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
        
        if (userConnections.some((c: any) => c.provider === 'stripe')) {
          stripeConnected = true
        }
        if (userConnections.some((c: any) => c.provider === 'quickbooks')) {
          quickbooksConnected = true
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
        },
        quickbooks: {
          connected: quickbooksConnected,
          name: 'QuickBooks Online',
        }
      }
    })
  } catch (error: any) {
    console.error('Status route error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
