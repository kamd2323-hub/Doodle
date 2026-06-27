'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  FileText, 
  Mail, 
  Activity,
  Settings, 
  LogOut 
} from 'lucide-react'
import { useSupabase } from '@/hooks/use-supabase'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Campaigns', href: '/campaigns', icon: Activity },
  { name: 'Sequences', href: '/sequences', icon: Mail },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const supabase = useSupabase()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-white">
      <div className="flex h-16 items-center px-6">
        <span className="text-xl font-bold">Reclaim AI</span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                  'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white',
                    'mr-3 h-5 w-5 flex-shrink-0'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex flex-shrink-0 bg-slate-800 p-4">
        <button
          onClick={handleSignOut}
          className="group block w-full flex-shrink-0"
        >
          <div className="flex items-center">
            <div>
              <LogOut className="inline-block h-5 w-5 text-slate-400 group-hover:text-white" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-400 group-hover:text-white">
                Sign Out
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
