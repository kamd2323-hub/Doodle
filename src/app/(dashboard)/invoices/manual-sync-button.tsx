'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ManualSyncButton() {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSync = async () => {
    setSyncing(true)
    setStatus('idle')
    
    try {
      const res = await fetch('/api/sync/all', {
        method: 'POST',
      })
      
      if (res.ok) {
        setStatus('success')
        router.refresh()
        // Reset success status after 3 seconds
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
      }
    } catch (err) {
      console.error('Manual sync error:', err)
      setStatus('error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Button 
      variant={status === 'error' ? 'destructive' : status === 'success' ? 'default' : 'outline'}
      size="sm"
      className={`relative transition-all duration-300 ${status === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
      disabled={syncing}
      onClick={handleSync}
    >
      {syncing ? (
        <>
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : status === 'success' ? (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Synced
        </>
      ) : status === 'error' ? (
        <>
          <AlertCircle className="mr-2 h-4 w-4" />
          Sync Failed
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Manual Sync
        </>
      )}
    </Button>
  )
}
