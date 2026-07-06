'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSupabase } from '@/hooks/use-supabase'
import { Palette, Save, Loader2, CheckCircle2, XCircle } from 'lucide-react'

const Label = ({ children, htmlFor, className }: any) => (
  <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
    {children}
  </label>
)

const Select = ({ children, value, onValueChange }: any) => (
  <select 
    value={value} 
    onChange={(e) => onValueChange(e.target.value)}
    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  >
    {children}
  </select>
)

const SelectItem = ({ children, value }: any) => <option value={value}>{children}</option>

export function BrandingTab() {
  const supabase = useSupabase()
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [profile, setProfile] = useState({
    organization_name: '',
    logo_url: '',
    default_from_name: '',
    global_tone_preference: 'polite'
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('organization_name, business_name, logo_url, default_from_name, global_tone_preference')
            .eq('id', user.id)
            .single()

          if (profileData) {
            setProfile({
              organization_name: profileData.organization_name || profileData.business_name || '',
              logo_url: profileData.logo_url || '',
              default_from_name: profileData.default_from_name || '',
              global_tone_preference: profileData.global_tone_preference || 'polite'
            })
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
      }
    }
    fetchProfile()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    setNotification(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          organization_name: profile.organization_name,
          logo_url: profile.logo_url,
          default_from_name: profile.default_from_name,
          global_tone_preference: profile.global_tone_preference,
          business_name: profile.organization_name
        })
        .eq('id', user.id)

      if (error) throw error
      setNotification({ type: 'success', message: 'Branding settings saved successfully.' })
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to save branding settings.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
            <Palette className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Branding & Profile</CardTitle>
            <CardDescription>Customize how your business appears in recovery emails</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {notification && (
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-3 text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
            {notification.message}
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-org-name">Organization Name</Label>
              <Input 
                id="brand-org-name"
                value={profile.organization_name} 
                onChange={(e) => setProfile({...profile, organization_name: e.target.value})}
                placeholder="Your Business Name"
              />
              <p className="text-[11px] text-slate-500">How your business is identified in emails.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-logo">Logo URL</Label>
              <Input 
                id="brand-logo"
                value={profile.logo_url} 
                onChange={(e) => setProfile({...profile, logo_url: e.target.value})}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-[11px] text-slate-500">Public URL to your company logo (PNG or SVG preferred).</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-from-name">Default "From" Name</Label>
              <Input 
                id="brand-from-name"
                value={profile.default_from_name} 
                onChange={(e) => setProfile({...profile, default_from_name: e.target.value})}
                placeholder="e.g. Finance Team"
              />
              <p className="text-[11px] text-slate-500">The sender name customers see in their inbox.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-tone">Global Tone Preference</Label>
              <Select 
                value={profile.global_tone_preference} 
                onValueChange={(value: string) => setProfile({...profile, global_tone_preference: value})}
              >
                <SelectItem value="polite">Polite & Friendly</SelectItem>
                <SelectItem value="firm">Firm & Professional</SelectItem>
                <SelectItem value="urgent">Urgent & Direct</SelectItem>
              </Select>
              <p className="text-[11px] text-slate-500">Sets the base personality for AI-generated messages.</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Branding Settings
        </Button>
      </CardFooter>
    </Card>
  )
}