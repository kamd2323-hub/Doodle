import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { migrateFromDemo } from '@/lib/demo/migrate'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Run demo-to-real migration if the user came from demo mode
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await migrateFromDemo(request, user.id)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin)
}