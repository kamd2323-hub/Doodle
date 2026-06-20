'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Pause, Play, Square, Loader2, MoreVertical } from "lucide-react"
import { useSupabase } from "@/hooks/use-supabase"
import { useRouter } from "next/navigation"

interface CampaignActionsProps {
  campaignId: string
  currentStatus: string
}

export function CampaignActions({ campaignId, currentStatus }: CampaignActionsProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    setIsOpen(false)
    const { error } = await supabase
      .from('dunning_campaigns')
      .update({ status: newStatus })
      .eq('id', campaignId)

    if (error) {
      alert('Error updating campaign status: ' + error.message)
    } else {
      router.refresh()
    }
    setIsUpdating(false)
  }

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 rounded-full" 
        disabled={isUpdating}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MoreVertical className="h-4 w-4 text-slate-400" />
        )}
      </Button>

      {isOpen && (
        <>
          <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border bg-white shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
            {currentStatus === 'paused' ? (
              <button 
                onClick={() => updateStatus('active')} 
                className="w-full flex items-center px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <Play className="mr-3 h-4 w-4" /> Resume Campaign
              </button>
            ) : currentStatus === 'active' ? (
              <button 
                onClick={() => updateStatus('paused')} 
                className="w-full flex items-center px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <Pause className="mr-3 h-4 w-4" /> Pause Campaign
              </button>
            ) : null}
            
            {(currentStatus === 'active' || currentStatus === 'paused') && (
              <button 
                onClick={() => updateStatus('stopped')} 
                className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Square className="mr-3 h-4 w-4" /> Stop Campaign
              </button>
            )}

            {currentStatus === 'stopped' && (
              <button 
                onClick={() => updateStatus('active')} 
                className="w-full flex items-center px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <Play className="mr-3 h-4 w-4" /> Restart Campaign
              </button>
            )}
          </div>
          {/* Closer overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        </>
      )}
    </div>
  )
}
