import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your-supabase-url'
  ? process.env.NEXT_PUBLIC_SUPABASE_URL
  : 'https://placeholder-project.supabase.co'

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your-supabase-anon-key'
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyPlaceholderTokenKey.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTk1OTgsImV4cCI6MjA5NzI5NTk5OH0.dummySignature'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Can be ignored if middleware handles it
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Can be ignored
          }
        },
      },
    }
  )
}
