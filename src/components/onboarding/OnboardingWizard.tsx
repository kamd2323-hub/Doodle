'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, ChevronRight, ArrowRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'

// ── Types ───────────────────────────────────────────────────────────────────

type OnboardingStep =
  | 'welcome'
  | 'connect_stripe'
  | 'configure_sequence'
  | 'activate'
  | 'complete'

interface StepRequirement {
  step: OnboardingStep
  label: string
  description: string
  completed: boolean
  cta: string
  ctaHref: string
}

interface OnboardingState {
  currentStep: OnboardingStep
  steps: StepRequirement[]
  isComplete: boolean
}

// ── Step Icons ──────────────────────────────────────────────────────────────

const stepIcons: Record<OnboardingStep, string> = {
  welcome: '👋',
  connect_stripe: '🔗',
  configure_sequence: '✉️',
  activate: '🚀',
  complete: '✅',
}

// ── Component ───────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const [state, setState] = useState<OnboardingState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)

  const fetchState = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/onboarding')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setState(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load onboarding state')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchState()
  }, [fetchState])

  const handleAdvance = async () => {
    try {
      setAdvancing(true)
      const res = await fetch('/api/onboarding/advance', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setState(data)
    } catch (err: any) {
      setError(err.message || 'Failed to advance')
    } finally {
      setAdvancing(false)
    }
  }

  // ── Loading State ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="border rounded-xl p-6 shadow-sm bg-white animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error State ───────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="border rounded-xl p-6 shadow-sm bg-white">
        <p className="text-sm text-red-500 mb-2">Failed to load setup status.</p>
        <button
          onClick={fetchState}
          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    )
  }

  if (!state) return null

  // ── Complete State ────────────────────────────────────────────────────

  if (state.isComplete) {
    return (
      <div className="border rounded-xl p-6 shadow-sm bg-white">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{stepIcons.complete}</span>
          <h2 className="text-lg font-semibold text-slate-900">Setup Complete</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Your account is fully configured and recovering invoices. Visit your dashboard to monitor progress.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          View Dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  // ── Step List ─────────────────────────────────────────────────────────

  const currentIdx = state.steps.findIndex(s => s.step === state.currentStep)

  return (
    <div className="border rounded-xl p-6 shadow-sm bg-white">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{stepIcons[state.currentStep]}</span>
        <h2 className="text-lg font-semibold text-slate-900">Getting Started</h2>
      </div>

      {/* Step indicators */}
      <div className="space-y-1 mb-6">
        {state.steps.map((s, i) => {
          const isCurrent = s.step === state.currentStep
          const isPast = i < currentIdx
          const isFuture = i > currentIdx

          return (
            <div
              key={s.step}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                ${isCurrent ? 'bg-indigo-50 border border-indigo-200' : ''}
                ${isPast ? 'opacity-60' : ''}
                ${isFuture ? 'opacity-40' : ''}
              `}
            >
              {/* Step number / check */}
              <div
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${s.completed
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-200 text-slate-500'}
                `}
              >
                {s.completed ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    isCurrent ? 'text-indigo-900' : 'text-slate-700'
                  }`}
                >
                  {s.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                )}
              </div>

              {/* Current step action link */}
              {isCurrent && !s.completed && (
                <Link
                  href={s.ctaHref}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 flex-shrink-0"
                >
                  {s.cta} <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* Advance button — for steps that complete via external action (e.g., Stripe connect) */}
      <button
        onClick={handleAdvance}
        disabled={advancing}
        className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
      >
        {advancing ? 'Checking...' : 'I\'ve completed this step →'}
      </button>
    </div>
  )
}