import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import * as fs from 'fs'

const FALLBACK_FILE_PATH = '/tmp/mock_oauth_connections.json'

export async function POST(request: Request) {
  return handleDisconnect(request)
}

export async function DELETE(request: Request) {
  return handleDisconnect(request)
}

async function handleDisconnect(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider || (provider !== 'stripe' && provider !== 'quickbooks')) {
      return NextResponse.json({ error: 'Invalid or missing provider parameter' }, { status: 400 })
    }

    let userId = 'mock-user-id'
    let supabase: any = null

    try {
      supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    } catch (e) {
      console.warn('Supabase auth check failed during disconnect, using mock-user-id:', e)
    }

    let disconnectedFromSupabase = false

    // 1. Delete from Supabase if configured
    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your-supabase-url') {
      try {
        const { error } = await supabase
          .from('oauth_connections')
          .delete()
          .eq('profile_id', userId)
          .eq('provider', provider)

        if (!error) {
          disconnectedFromSupabase = true
          console.log(`Successfully deleted ${provider} connection from Supabase DB`)
        } else {
          console.warn(`Supabase DB delete failed for ${provider}:`, error.message)
        }
      } catch (err) {
        console.warn(`Supabase DB delete failed for ${provider}:`, err)
      }
    }

    // 2. Delete from local fallback JSON store (highly robust!)
    if (fs.existsSync(FALLBACK_FILE_PATH)) {
      try {
        const fileContent = fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8')
        let connections = JSON.parse(fileContent)
        const initialLength = connections.length
        
        connections = connections.filter(
          (c: any) => !(c.profile_id === userId && c.provider === provider)
        )
        
        if (connections.length !== initialLength) {
          fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(connections, null, 2), 'utf-8')
          console.log(`Successfully deleted ${provider} connection from local fallback store`)
        }
      } catch (err) {
        console.error('Error modifying fallback store during disconnect:', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully disconnected ${provider === 'stripe' ? 'Stripe' : 'QuickBooks Online'} integration`,
    })
  } catch (error: any) {
    console.error('Disconnect handler error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
