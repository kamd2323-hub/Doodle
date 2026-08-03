import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function DemoEntryPage() {
  const cookieStore = await cookies()
  cookieStore.set('reclaim_demo_mode', 'true', {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })
  redirect('/demo/dashboard')
}
