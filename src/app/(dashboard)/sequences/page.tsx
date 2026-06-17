import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Clock, 
  Mail, 
  Trash2, 
  Edit 
} from "lucide-react"

const defaultSequence = [
  {
    id: 1,
    name: "First Reminder",
    daysAfterDue: 1,
    subject: "Reminder: Invoice #INV-001 is due",
    status: "Active",
  },
  {
    id: 2,
    name: "Second Reminder",
    daysAfterDue: 7,
    subject: "Overdue: Invoice #INV-001",
    status: "Active",
  },
  {
    id: 3,
    name: "Final Notice",
    daysAfterDue: 14,
    subject: "Urgent: Final Notice for Invoice #INV-001",
    status: "Active",
  },
]

export default function SequencesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Email Sequences</h1>
          <p className="text-slate-500">Configure your automated invoice recovery workflow.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="mr-2 h-4 w-4" /> Add Step
        </Button>
      </div>

      <div className="space-y-4">
        {defaultSequence.map((step, index) => (
          <Card key={step.id} className="relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1 bg-indigo-600" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                    Step {index + 1}
                  </Badge>
                  <CardTitle className="text-lg">{step.name}</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription className="flex items-center">
                <Clock className="mr-1 h-3 w-3" /> Sent {step.daysAfterDue} day{step.daysAfterDue > 1 ? 's' : ''} after due date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="flex items-start space-x-3">
                  <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Subject: {step.subject}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Hi [Client Name], this is a friendly reminder that your invoice [Invoice Number] is now [Days Overdue] days past due...
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
