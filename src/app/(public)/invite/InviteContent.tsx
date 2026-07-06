'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  ShieldAlert,
  Users,
  LogIn,
  ArrowRight,
  Building2,
} from 'lucide-react'

interface InvitationData {
  invitation: {
    id: string
    organization_id: string
    email: string
    role: 'admin' | 'member'
    expires_at: string
  }
  organization: {
    name: string
    logo_url?: string
  }
  invited_by: string
}

type PageState = 'loading' | 'valid' | 'expired' | 'accepted' | 'not_found' | 'accepting' | 'success'

export default function InviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [pageState, setPageState] = useState<PageState>('loading')
  const [data, setData] = useState<InvitationData | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const fetchInvitation = useCallback(async () => {
    if (!token) {
      setPageState('not_found')
      setErrorMsg('No invitation token provided.')
      return
    }

    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`)
      if (res.status === 410) {
        const body = await res.json()
        if (body.error?.includes('already been accepted')) {
          setPageState('accepted')
        } else {
          setPageState('expired')
        }
        setErrorMsg(body.error || '')
        return
      }
      if (res.status === 404) {
        setPageState('not_found')
        setErrorMsg('Invitation not found.')
        return
      }
      if (!res.ok) {
        setPageState('not_found')
        setErrorMsg('Failed to load invitation.')
        return
      }

      const body: InvitationData = await res.json()
      setData(body)
      setPageState('valid')
    } catch (err) {
      setPageState('not_found')
      setErrorMsg('Network error. Please try again.')
    }
  }, [token])

  useEffect(() => {
    fetchInvitation()
  }, [fetchInvitation])

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/organization')
        if (res.ok) {
          setIsLoggedIn(true)
        } else {
          setIsLoggedIn(false)
        }
      } catch {
        setIsLoggedIn(false)
      }
    }
    if (pageState === 'valid') {
      checkAuth()
    }
  }, [pageState])

  const handleAccept = async () => {
    if (!token) return
    setPageState('accepting')
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body.error || 'Failed to accept invitation')
      }
      setPageState('success')
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept invitation')
      setPageState('valid')
    }
  }

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading invitation...</p>
        </div>
      </div>
    )
  }

  // Expired state
  if (pageState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invitation Expired</h1>
          <p className="text-sm text-slate-500 mb-6">
            This invitation has expired. Invitations are valid for 7 days.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Please ask your organization admin to send a new invitation.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Already accepted state
  if (pageState === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Already Accepted</h1>
          <p className="text-sm text-slate-500 mb-6">
            This invitation has already been accepted.
          </p>
          <Link href="/dashboard">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Not found state
  if (pageState === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invitation Not Found</h1>
          <p className="text-sm text-slate-500 mb-6">
            {errorMsg || 'The invitation link may be invalid.'}
          </p>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Success state (after accepting)
  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Welcome to {data?.organization?.name || 'your team'}!
          </h1>
          <p className="text-sm text-slate-500 mb-2">
            You have successfully joined the organization.
          </p>
          <p className="text-xs text-slate-400">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    )
  }

  // Valid invitation — show the card
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">You're Invited!</h1>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Organization info */}
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-1">
              You've been invited to join
            </p>
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">
                {data?.organization?.name || 'an organization'}
              </h2>
            </div>
          </div>

          {/* Details */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Role</span>
              <Badge
                className={data?.invitation?.role === 'admin'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
                }
              >
                {data?.invitation?.role === 'admin' ? (
                  <ShieldAlert className="h-3 w-3 mr-1" />
                ) : (
                  <Shield className="h-3 w-3 mr-1" />
                )}
                {data?.invitation?.role === 'admin' ? 'Admin' : 'Member'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Invited by</span>
              <span className="font-medium text-slate-700">{data?.invited_by || 'An admin'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Expires</span>
              <span className="font-medium text-slate-700">
                {data?.invitation?.expires_at
                  ? new Date(data.invitation.expires_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—'}
              </span>
            </div>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Action buttons */}
          {isLoggedIn ? (
            <div className="space-y-3">
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11"
                onClick={handleAccept}
                disabled={pageState === 'accepting'}
              >
                {pageState === 'accepting' ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Accepting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Accept Invitation
                  </span>
                )}
              </Button>
              <Link href="/dashboard" className="block">
                <Button variant="outline" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <Link href={`/login?redirect=/invite?token=${token}`} className="block">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11">
                  <LogIn className="mr-2 h-4 w-4" />
                  Log In to Accept
                </Button>
              </Link>
              <p className="text-center text-xs text-slate-400">
                Don't have an account?{' '}
                <Link href={`/signup?redirect=/invite?token=${token}`} className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Sign Up
                </Link>
              </p>
            </div>
          )}

          <p className="text-xs text-slate-400 text-center">
            By accepting, you agree to join this organization on Reclaim AI.
          </p>
        </div>
      </div>
    </div>
  )
}