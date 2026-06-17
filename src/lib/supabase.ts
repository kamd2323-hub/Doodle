import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your-supabase-url'
  ? process.env.NEXT_PUBLIC_SUPABASE_URL
  : 'https://placeholder-project.supabase.co'

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your-supabase-anon-key'
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyPlaceholderTokenKey.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTk1OTgsImV4cCI6MjA5NzI5NTk5OH0.dummySignature'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
