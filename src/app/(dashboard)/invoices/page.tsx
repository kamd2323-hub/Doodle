import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const invoices = [
  {
    id: "INV001",
    client: "Acme Corp",
    amount: "$250.00",
    status: "Paid",
    date: "2026-06-01",
  },
  {
    id: "INV002",
    client: "Global Tech",
    amount: "$1,200.00",
    status: "Overdue",
    date: "2026-05-15",
  },
  {
    id: "INV003",
    client: "Starlight Inc",
    amount: "$850.00",
    status: "Pending",
    date: "2026-06-10",
  },
  {
    id: "INV004",
    client: "Nexus Solutions",
    amount: "$450.00",
    status: "Paid",
    date: "2026-06-05",
  },
  {
    id: "INV005",
    client: "Velocity Agency",
    amount: "$3,000.00",
    status: "Overdue",
    date: "2026-05-20",
  },
]

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Invoices</h1>
        <p className="text-slate-500">Manage and track your client invoices.</p>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Invoice</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.id}</TableCell>
                <TableCell>{invoice.client}</TableCell>
                <TableCell>{invoice.date}</TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      invoice.status === "Paid" ? "default" : 
                      invoice.status === "Overdue" ? "destructive" : "secondary"
                    }
                  >
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{invoice.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
