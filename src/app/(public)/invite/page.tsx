import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import InviteContent from './InviteContent'

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading invitation...</p>
        </div>
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}