import { getDemoState } from '@/lib/demo/state'
import { DemoBanner } from '@/components/demo/DemoBanner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export default function DemoCampaignsPage() {
  const state = getDemoState()

  return (
    <>
      <DemoBanner />
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dunning Campaigns</h1>
          <p className="text-slate-500">Monitor and manage your active recovery campaigns in real-time. (Demo data)</p>
        </div>

        <div className="rounded-md border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Client / Invoice</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sequence</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Started On</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Next Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.campaigns.map((c) => (
                <tr key={c.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{c.client_name}</div>
                    <div className="text-xs text-slate-500 font-mono">#{c.invoice_number}</div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={
                        c.status === 'recovered'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                          : c.status === 'active'
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200'
                      }
                    >
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{c.sequence_name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all"
                          style={{ width: `${(c.current_step / c.total_steps) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {c.current_step}/{c.total_steps}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {format(new Date(c.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {c.last_action_at ? format(new Date(c.last_action_at), 'MMM d, h:mm a') : 'No activity'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {c.next_action_at ? (
                      <span className="text-indigo-600 font-medium">
                        {format(new Date(c.next_action_at), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
