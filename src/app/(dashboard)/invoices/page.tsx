import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase-server"
import { format } from "date-fns"
import Link from "next/link"
import { ManualSyncButton } from "./manual-sync-button"

export default async function InvoicesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return <div>Please log in to view invoices.</div>
  }

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      amount_cents,
      currency,
      status,
      issued_at,
      clients (
        name
      ),
      dunning_campaigns (
        id,
        status
      )
    `)
    .eq('profile_id', user.id)
    .order('issued_at', { ascending: false })

  // Fetch last sync status
  const { data: connections } = await supabase
    .from('oauth_connections')
    .select('last_synced_at, provider')
    .eq('profile_id', user.id)

  const lastSync = connections?.reduce((latest: Date | null, conn: any) => {
    if (!conn.last_synced_at) return latest
    const connDate = new Date(conn.last_synced_at)
    if (!latest || connDate > latest) return connDate
    return latest
  }, null)

  if (error) {
    console.error('Error fetching invoices:', error)
    return <div>Error loading invoices.</div>
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Invoices</h1>
          <p className="text-slate-500">Manage and track your client invoices.</p>
        </div>
        <div className="flex items-center gap-4">
          {lastSync && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Last Synced</p>
              <p className="text-sm font-medium text-slate-600">{format(lastSync, 'MMM d, h:mm a')}</p>
            </div>
          )}
          <ManualSyncButton />
        </div>
      </div>
      <div className="rounded-md border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="w-[150px]">Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recovery</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500 italic">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              invoices?.map((invoice: any) => (
                <TableRow key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium text-slate-900">{invoice.invoice_number || invoice.id.slice(0, 8)}</TableCell>
                  <TableCell>{invoice.clients?.name || 'Unknown'}</TableCell>
                  <TableCell className="text-slate-600">{invoice.issued_at ? format(new Date(invoice.issued_at), 'MMM d, yyyy') : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status === "paid" ? "default" :
                        invoice.status === "open" ? "destructive" : "secondary"
                      }
                      className={
                        invoice.status === "paid" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200" :
                        invoice.status === "open" ? "bg-red-50 text-red-700 hover:bg-red-50 border-red-200" : ""
                      }
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invoice.dunning_campaigns ? (
                      <Link href="/campaigns">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                          {invoice.dunning_campaigns.status.charAt(0).toUpperCase() + invoice.dunning_campaigns.status.slice(1)}
                        </Badge>
                      </Link>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    {formatCurrency(invoice.amount_cents, invoice.currency)}
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
