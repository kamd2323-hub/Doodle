'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { CampaignHistory } from "./campaign-history"
import { CampaignActions } from "./campaign-actions"
import { useSupabase } from "@/hooks/use-supabase"
import { Loader2 } from "lucide-react"

export default function CampaignsPage() {
  const supabase = useSupabase()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCampaigns = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('dunning_campaigns')
      .select(`
        id,
        status,
        created_at,
        next_action_at,
        last_action_at,
        invoices (
          id,
          invoice_number,
          clients (
            name
          )
        )
      `)
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching campaigns:', error)
    } else {
      setCampaigns(data || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchCampaigns()

    // Set up real-time subscription
    const channel = supabase
      .channel('dunning_campaigns_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dunning_campaigns',
        },
        () => {
          fetchCampaigns()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchCampaigns])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dunning Campaigns</h1>
        <p className="text-slate-500">Monitor and manage your active recovery campaigns in real-time.</p>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead>Client / Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started On</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Next Action</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500 italic">
                  No dunning campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="font-medium text-slate-900">
                      {campaign.invoices?.clients?.name || 'Unknown Client'}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      #{campaign.invoices?.invoice_number || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        campaign.status === "recovered" ? "default" :
                        campaign.status === "active" ? "secondary" :
                        campaign.status === "paused" ? "outline" : "secondary"
                      }
                      className={
                        campaign.status === "recovered" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200" :
                        campaign.status === "active" ? "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200" :
                        campaign.status === "paused" ? "bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200" : ""
                      }
                    >
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {campaign.last_action_at ? format(new Date(campaign.last_action_at), 'MMM d, h:mm a') : 'No activity'}
                  </TableCell>
                  <TableCell className="text-slate-600 font-medium">
                    {campaign.status === 'active' && campaign.next_action_at ? (
                      <span className="text-indigo-600">
                        {format(new Date(campaign.next_action_at), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <CampaignHistory campaignId={campaign.id} />
                      <CampaignActions campaignId={campaign.id} currentStatus={campaign.status} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
