import { createClient } from '@/lib/supabase'
import { useMemo } from 'react'

export function useSupabase() {
  return useMemo(createClient, [])
}
