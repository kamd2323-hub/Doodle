'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Mail, Loader2 } from 'lucide-react'

interface InviteMemberDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (email: string, role: 'admin' | 'member') => Promise<void>
}

export function InviteMemberDialog({ open, onClose, onSubmit }: InviteMemberDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      setError('Email address is required')
      return
    }
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(email.trim(), role)
      setEmail('')
      setRole('member')
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setEmail('')
      setRole('member')
      setError(null)
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) handleClose() }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Invite Team Member</h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="invite-email" className="text-sm font-medium text-slate-700">
              Email address
            </label>
            <Input
              ref={inputRef}
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="invite-role" className="text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              disabled={submitting}
            >
              <option value="member">Member — Operational access only</option>
              <option value="admin">Admin — Full access to all settings</option>
            </select>
            <p className="text-xs text-slate-500">
              {role === 'admin'
                ? 'Admins can manage billing, integrations, and team members.'
                : 'Members can use recovery features and view dashboards.'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}