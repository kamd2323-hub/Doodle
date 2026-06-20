'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Clock,
  Mail,
  Trash2,
  Edit,
  Loader2,
  ChevronRight,
  ChevronDown,
  Save,
  X
} from "lucide-react"
import { useSupabase } from "@/hooks/use-supabase"

interface Sequence {
  id: string
  name: string
  description: string | null
  is_default: boolean
  is_active: boolean
}

interface SequenceStep {
  id: string
  sequence_id: string
  step_number: number
  delay_days: number
  email_subject: string
  email_body: string
}

export default function SequencesPage() {
  const supabase = useSupabase()
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null)
  const [steps, setSteps] = useState<SequenceStep[]>([])
  const [loading, setLoading] = useState(true)
  const [stepsLoading, setStepsLoading] = useState(false)
  const [editingStep, setEditingStep] = useState<Partial<SequenceStep> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const sampleData = {
    customer_name: 'John Doe',
    invoice_number: 'INV-2024-001',
    amount_due: '$1,250.00'
  }

  const replacePlaceholders = (text: string) => {
    let result = text
    result = result.replace(/\{\{customer_name\}\}/g, sampleData.customer_name)
    result = result.replace(/\{\{invoice_number\}\}/g, sampleData.invoice_number)
    result = result.replace(/\{\{amount_due\}\}/g, sampleData.amount_due)
    return result
  }

  const fetchSequences = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sequences')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching sequences:', error)
    } else {
      setSequences(data || [])
      if (data && data.length > 0 && !selectedSequence) {
        setSelectedSequence(data[0])
      }
    }
    setLoading(false)
  }, [supabase, selectedSequence])

  const fetchSteps = useCallback(async (sequenceId: string) => {
    setStepsLoading(true)
    const { data, error } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', sequenceId)
      .order('step_number', { ascending: true })

    if (error) {
      console.error('Error fetching steps:', error)
    } else {
      setSteps(data || [])
    }
    setStepsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchSequences()
  }, [fetchSequences])

  useEffect(() => {
    if (selectedSequence) {
      fetchSteps(selectedSequence.id)
    }
  }, [selectedSequence, fetchSteps])

  const handleAddStep = () => {
    if (!selectedSequence) return
    const nextStepNumber = steps.length > 0 
      ? Math.max(...steps.map(s => s.step_number)) + 1 
      : 1
    
    setEditingStep({
      sequence_id: selectedSequence.id,
      step_number: nextStepNumber,
      delay_days: 1,
      email_subject: '',
      email_body: ''
    })
  }

  const handleEditStep = (step: SequenceStep) => {
    setEditingStep(step)
  }

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return

    const { error } = await supabase
      .from('sequence_steps')
      .delete()
      .eq('id', stepId)

    if (error) {
      alert('Error deleting step: ' + error.message)
    } else {
      if (selectedSequence) fetchSteps(selectedSequence.id)
    }
  }

  const handleSaveStep = async () => {
    if (!editingStep || !selectedSequence) return
    setIsSaving(true)

    const payload = {
      sequence_id: selectedSequence.id,
      step_number: editingStep.step_number,
      delay_days: editingStep.delay_days,
      email_subject: editingStep.email_subject,
      email_body: editingStep.email_body,
    }

    let error
    if (editingStep.id) {
      // Update
      const { error: updateError } = await supabase
        .from('sequence_steps')
        .update(payload)
        .eq('id', editingStep.id)
      error = updateError
    } else {
      // Create
      const { error: insertError } = await supabase
        .from('sequence_steps')
        .insert([payload])
      error = insertError
    }

    if (error) {
      alert('Error saving step: ' + error.message)
    } else {
      setEditingStep(null)
      fetchSteps(selectedSequence.id)
    }
    setIsSaving(false)
  }

  const handleAddSequence = async () => {
    const name = prompt('Enter sequence name:')
    if (!name) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('sequences')
      .insert([{ 
        name, 
        profile_id: user.id,
        is_active: true
      }])
      .select()

    if (error) {
      alert('Error creating sequence: ' + error.message)
    } else if (data) {
      fetchSequences()
      setSelectedSequence(data[0])
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Email Sequences</h1>
          <p className="text-slate-500">Configure your automated invoice recovery workflow.</p>
        </div>
        <Button onClick={handleAddSequence} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <Plus className="mr-2 h-4 w-4" /> New Sequence
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sequence List sidebar */}
        <div className="space-y-2 lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 px-2 mb-3">Your Sequences</h2>
          {sequences.map((seq) => (
            <button
              key={seq.id}
              onClick={() => setSelectedSequence(seq)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                selectedSequence?.id === seq.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="truncate">{seq.name}</span>
              {seq.is_default && <Badge className="ml-2 bg-indigo-400 text-[10px] px-1 h-4">Default</Badge>}
            </button>
          ))}
          {sequences.length === 0 && (
            <p className="text-sm text-slate-400 italic px-2">No sequences yet.</p>
          )}
        </div>

        {/* Steps for selected sequence */}
        <div className="lg:col-span-3 space-y-4">
          {selectedSequence ? (
            <>
              <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedSequence.name}</h2>
                  <p className="text-sm text-slate-500">{selectedSequence.description || 'No description'}</p>
                </div>
                <Button onClick={handleAddStep} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="mr-2 h-4 w-4" /> Add Step
                </Button>
              </div>

              {stepsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {steps.map((step, index) => (
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
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditStep(step)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteStep(step.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                            <div className="text-sm text-slate-600 line-clamp-2 italic">
                              {step.email_body}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {steps.length === 0 && (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-10 text-center">
                      <Mail className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                      <p className="text-slate-500">No steps in this sequence. Click "Add Step" to begin.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-10 text-center">
              <p className="text-slate-500">Select or create a sequence to see its steps.</p>
            </div>
          )}
        </div>
      </div>

      {/* Basic Step Editor "Modal" Overlay */}
      {editingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50">
              <h3 className="text-lg font-semibold">{editingStep.id ? 'Edit Step' : 'Add New Step'}</h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowPreview(!showPreview)}
                  className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
                    showPreview ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {showPreview ? 'Edit Template' : 'Preview Email'}
                </button>
                <button onClick={() => { setEditingStep(null); setShowPreview(false); }} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {!showPreview ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Step Number</label>
                      <Input 
                        type="number" 
                        value={editingStep.step_number} 
                        onChange={(e) => setEditingStep({...editingStep, step_number: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Delay (Days)</label>
                      <Input 
                        type="number" 
                        value={editingStep.delay_days} 
                        onChange={(e) => setEditingStep({...editingStep, delay_days: parseInt(e.target.value)})}
                      />
                      <p className="text-[10px] text-slate-400">Wait time since previous step.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email Subject</label>
                    <Input 
                      value={editingStep.email_subject} 
                      onChange={(e) => setEditingStep({...editingStep, email_subject: e.target.value})}
                      placeholder="e.g. Reminder: Your payment is overdue"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email Body</label>
                    <textarea 
                      className="flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={editingStep.email_body} 
                      onChange={(e) => setEditingStep({...editingStep, email_body: e.target.value})}
                      placeholder="Write your email template here... (Markdown supported)"
                    />
                    <p className="text-[10px] text-slate-400">Placeholders: {"{{customer_name}}, {{invoice_number}}, {{amount_due}}"}</p>
                  </div>
                </>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject</span>
                      <p className="text-slate-900 font-medium">{replacePlaceholders(editingStep.email_subject || '') || '(No subject)'}</p>
                    </div>
                    <hr className="border-slate-200" />
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Body</span>
                      <div className="text-slate-700 whitespace-pre-wrap mt-2 prose prose-sm max-w-none">
                        {replacePlaceholders(editingStep.email_body || '') || '(No content)'}
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-md p-3 flex items-start gap-3">
                    <div className="bg-amber-100 p-1 rounded">
                      <Clock className="h-4 w-4 text-amber-700" />
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      This is a preview using sample data. When sent to a real customer, 
                      the placeholders will be replaced with their actual invoice details.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t px-6 py-4 bg-slate-50">
              <Button variant="ghost" onClick={() => { setEditingStep(null); setShowPreview(false); }} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSaveStep} className="bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingStep.id ? 'Update Step' : 'Create Step'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
