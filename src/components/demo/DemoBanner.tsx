'use client'

import { X, ExternalLink } from 'lucide-react'
import { useState } from 'react'

export function DemoBanner() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800 shrink-0">
            DEMO
          </span>
          <p className="text-sm text-amber-800 truncate">
            You're previewing <span className="font-semibold">Reclaim AI</span> with sample data.{' '}
            <a
              href="/signup"
              className="underline underline-offset-2 font-medium hover:text-amber-900 whitespace-nowrap"
            >
              Connect Stripe to see your real invoices
            </a>
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="shrink-0 p-1 rounded-md text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-colors"
          aria-label="Dismiss demo banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
