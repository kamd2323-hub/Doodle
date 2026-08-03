import { NextResponse } from 'next/server'
import { getDemoState } from '@/lib/demo/state'

export async function GET() {
  const state = getDemoState()

  const response = NextResponse.json(state)

  // Set demo cookie — 24 hour expiry
  response.cookies.set('reclaim_demo_mode', 'true', {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })

  return response
}
