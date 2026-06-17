import { createClient } from '@/lib/supabase-server'
import { syncAll } from '@/lib/sync'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    let userId = 'mock-user-id'
    let isAuthenticated = false
    let supabase: any = null

    try {
      supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        isAuthenticated = true
      }
    } catch (e) {
      console.warn('[Sync API] Supabase auth check failed or timed out:', e)
    }

    const isMockEnv = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                      process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url'

    // If we're in a live production setting but have no valid user, reject with 401
    if (!isAuthenticated && !isMockEnv) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Sync API] Triggering syncAll for user: ${userId} (Authenticated: ${isAuthenticated})`)
    const results = await syncAll(userId)

    const overallSuccess = results.length > 0 ? results.every(r => r.success) : true

    return NextResponse.json({
      success: overallSuccess,
      timestamp: new Date().toISOString(),
      results
    })
  } catch (error: any) {
    console.error('[Sync API] Critical unhandled error during sync invocation:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error.message || error 
    }, { status: 500 })
  }
}

// Support GET requests too to make manual testing via browser or simple curl extremely easy
export async function GET(request: Request) {
  try {
    let userId = 'mock-user-id'
    let isAuthenticated = false
    let supabase: any = null

    try {
      supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        isAuthenticated = true
      }
    } catch (e) {
      console.warn('[Sync API GET] Supabase auth check failed or timed out:', e)
    }

    const isMockEnv = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                      process.env.NEXT_PUBLIC_SUPABASE_URL === 'your-supabase-url'

    if (!isAuthenticated && !isMockEnv) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Sync API GET] Triggering syncAll for user: ${userId} (Authenticated: ${isAuthenticated})`)
    const results = await syncAll(userId)

    const overallSuccess = results.length > 0 ? results.every(r => r.success) : true

    return NextResponse.json({
      success: overallSuccess,
      timestamp: new Date().toISOString(),
      results
    })
  } catch (error: any) {
    console.error('[Sync API GET] Critical unhandled error during sync invocation:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error.message || error 
    }, { status: 500 })
  }
}
