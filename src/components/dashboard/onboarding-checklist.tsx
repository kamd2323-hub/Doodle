'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle2, Circle, ArrowRight, Settings, CreditCard, Mail, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ChecklistItem {
  id: string
  title: string
  description: string
  completed: boolean
  href: string
  icon: any
}

interface OnboardingChecklistProps {
  profile: any
  hasIntegrations: boolean
  hasCampaigns: boolean
}

// Fallback Progress component since it might not be in UI library
const ProgressBar = ({ value }: { value: number }) => (
  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
    <div 
      className="h-full bg-indigo-600 transition-all duration-500 ease-out" 
      style={{ width: `${value}%` }}
    />
  </div>
)

export function OnboardingChecklist({ profile, hasIntegrations, hasCampaigns }: OnboardingChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  
  useEffect(() => {
    const checklist: ChecklistItem[] = [
      {
        id: 'integration',
        title: 'Connect Accounting Software',
        description: 'Link your Stripe or QuickBooks account to sync invoices.',
        completed: hasIntegrations,
        href: '/settings',
        icon: CreditCard
      },
      {
        id: 'branding',
        title: 'Set Up Branding',
        description: 'Add your business name and tone preference for emails.',
        completed: !!(profile?.organization_name || profile?.business_name),
        href: '/settings',
        icon: Settings
      },
      {
        id: 'campaign',
        title: 'Launch First Recovery',
        description: 'Review and start your first dunning campaign.',
        completed: hasCampaigns,
        href: '/invoices',
        icon: Sparkles
      }
    ]
    setItems(checklist)
  }, [profile, hasIntegrations, hasCampaigns])

  const completedCount = items.filter(i => i.completed).length
  const progress = (completedCount / items.length) * 100

  if (completedCount === items.length) return null

  return (
    <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm overflow-hidden mb-8">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Getting Started
              <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200 ml-2">
                {completedCount}/{items.length} Complete
              </Badge>
            </CardTitle>
            <CardDescription className="text-slate-600 mt-1">
              Complete these steps to fully automate your invoice recovery.
            </CardDescription>
          </div>
          <div className="w-full md:w-48 space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>Setup Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div 
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                item.completed 
                  ? 'bg-white border-slate-100 opacity-75' 
                  : 'bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${item.completed ? 'bg-slate-50 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                {item.completed ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 fill-emerald-50" />
                ) : (
                  <Circle className="h-6 w-6 text-slate-200" />
                )}
              </div>
              <h3 className={`font-bold text-sm mb-1 ${item.completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                {item.title}
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                {item.description}
              </p>
              {!item.completed && (
                <Button asChild size="sm" variant="ghost" className="w-full justify-between text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-0 h-auto">
                  <Link href={item.href}>
                    Go to {item.title.split(' ').pop()} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Inline Badge component if not in UI library
function Badge({ children, className }: any) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border ${className}`}>
      {children}
    </span>
  )
}
