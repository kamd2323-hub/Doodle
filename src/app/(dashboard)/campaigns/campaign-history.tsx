'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { History, Mail, Calendar, Loader2, X } from "lucide-react"
import { useSupabase } from "@/hooks/use-supabase"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface CampaignHistoryProps {
  campaignId: string
}

export function CampaignHistory({ campaignId }: CampaignHistoryProps) {
  const supabase = useSupabase()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const fetchHistory = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('dunning_email_logs')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching campaign history:', error)
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }

  const toggleOpen = () => {
    const nextOpen = !isOpen
    setIsOpen(nextOpen)
    if (nextOpen) {
      fetchHistory()
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-slate-600" onClick={toggleOpen}>
        <History className="mr-2 h-4 w-4" /> History
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="h-full w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Campaign History</h2>
                  <p className="text-sm text-slate-500">History of all communications sent.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-8">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 italic">
                      <Mail className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                      <p>No history found for this campaign.</p>
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="relative pl-8 pb-8 border-l-2 border-slate-100 last:pb-0 last:border-l-0">
                        <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-indigo-600 ring-4 ring-white shadow-sm" />
                        
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="font-bold text-slate-900 leading-tight">
                            {log.sent_subject}
                          </div>
                          <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className="shrink-0 text-[10px] h-4">
                            {log.status}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-4">
                          <span className="flex items-center">
                            <Calendar className="mr-1.5 h-3.5 w-3.5" />
                            {format(new Date(log.created_at), 'MMM d, h:mm a')}
                          </span>
                          <span className="flex items-center">
                            <Mail className="mr-1.5 h-3.5 w-3.5" />
                            {log.recipient_email}
                          </span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 italic border border-slate-100 leading-relaxed">
                          {log.sent_body}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Backdrop closer */}
          <div className="absolute inset-0 -z-10" onClick={() => setIsOpen(false)} />
        </div>
      )}
    </>
  )
}
