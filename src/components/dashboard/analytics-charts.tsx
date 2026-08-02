'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────

interface MonthlyBar {
  month: string
  recovered: number
  sent: number
}

interface StatusSlice {
  label: string
  count: number
  color: string
}

interface BarChartProps {
  data: MonthlyBar[]
  className?: string
}

interface DonutChartProps {
  data: StatusSlice[]
  total: number
  className?: string
}

// ── Utility ────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatCompact(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`
  return `$${dollars.toFixed(0)}`
}

// ── Monthly Bar Chart ──────────────────────────────────────────────────

export function MonthlyRecoveryChart({ data, className }: BarChartProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-400 italic">
        No monthly data available yet
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.recovered, d.sent)), 1)

  return (
    <div className={className}>
      {/* Legend */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-indigo-500" />
          <span className="text-xs text-slate-500">Recovered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-slate-300" />
          <span className="text-xs text-slate-500">Emails Sent</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-48 flex items-end gap-2">
        {data.map((bar, i) => {
          const recoveredH = (bar.recovered / maxValue) * 100
          const sentH = (bar.sent / maxValue) * 100
          const isHovered = hoveredBar === i

          return (
            <div
              key={bar.month}
              className="flex-1 flex flex-col items-center gap-1 min-w-0 group"
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-10 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap pointer-events-none">
                  <div className="font-medium mb-0.5">{bar.month}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-300">Recovered:</span>
                    <span>{formatCurrency(bar.recovered)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Sent:</span>
                    <span>{bar.sent}</span>
                  </div>
                </div>
              )}

              {/* Bars */}
              <div className="w-full flex flex-col items-center gap-0.5" style={{ height: '100%' }}>
                <div className="w-full flex-1 flex items-end justify-center gap-[2px]">
                  <div
                    className="w-[40%] max-w-[20px] bg-slate-300 rounded-t-sm transition-all duration-200 group-hover:bg-slate-400"
                    style={{ height: `${sentH}%` }}
                  />
                  <div
                    className="w-[40%] max-w-[20px] bg-indigo-500 rounded-t-sm transition-all duration-200 group-hover:bg-indigo-600"
                    style={{ height: `${recoveredH}%` }}
                  />
                </div>
              </div>

              {/* Label */}
              <span className="text-[10px] text-slate-400 font-medium mt-1">
                {bar.month}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Donut / Ring Chart ──────────────────────────────────────────────────

export function CampaignStatusChart({ data, total, className }: DonutChartProps) {
  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400 italic">
        No campaign data yet
      </div>
    )
  }

  // Build conic-gradient segments
  let cumulative = 0
  const segments = data.map(slice => {
    const start = cumulative
    const pct = slice.count / total
    cumulative += pct
    return { ...slice, start: start * 360, end: cumulative * 360 }
  })

  const gradient = segments
    .map(s => `${s.color} ${s.start.toFixed(1)}deg ${s.end.toFixed(1)}deg`)
    .join(', ')

  return (
    <div className={className}>
      <div className="flex items-center justify-center gap-6">
        {/* Donut */}
        <div className="relative w-32 h-32 flex-shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${gradient})`,
              mask: 'radial-gradient(transparent 58%, black 60%)',
              WebkitMask: 'radial-gradient(transparent 58%, black 60%)',
            }}
          />
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-slate-800">{total}</span>
            <span className="text-[10px] text-slate-400">campaigns</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2">
          {data.map(slice => (
            <div key={slice.label} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-xs text-slate-600">{slice.label}</span>
              <span className="text-xs font-semibold text-slate-800 ml-auto">{slice.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Trend Indicator ─────────────────────────────────────────────────────

export function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Minus className="h-3 w-3" /> --
      </span>
    )
  }

  const pct = ((current - previous) / previous) * 100
  const isUp = pct >= 0

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isUp ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}
