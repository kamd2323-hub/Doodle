import { getDemoState } from '@/lib/demo/state'
import { DemoBanner } from '@/components/demo/DemoBanner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Mail } from 'lucide-react'

export default function DemoSequencesPage() {
  const state = getDemoState()

  return (
    <>
      <DemoBanner />
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Email Sequences</h1>
          <p className="text-slate-500">Configure your automated invoice recovery workflow. (Demo data)</p>
        </div>

        {state.sequences.map((seq) => (
          <div key={seq.id} className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{seq.name}</h2>
                <p className="text-sm text-slate-500">{seq.description}</p>
              </div>
              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">Default</Badge>
            </div>

            <div className="space-y-4">
              {seq.steps.map((step, idx) => (
                <Card key={step.id} className="relative overflow-hidden border-slate-200">
                  <div className="absolute left-0 top-0 h-full w-1 bg-indigo-600" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          Step {step.step_number}
                        </Badge>
                        <CardTitle className="text-lg">{step.email_subject}</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {step.delay_days === 0
                        ? 'Sent immediately when invoice is overdue'
                        : `Sent ${step.delay_days} day${step.delay_days > 1 ? 's' : ''} after previous action`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md bg-slate-50 p-3">
                      <div className="flex items-start space-x-3">
                        <Mail className="mt-0.5 h-4 w-4 text-slate-400 shrink-0" />
                        <div className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3 italic">
                          {step.email_body}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
