import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  DollarSign, 
  BarChart3, 
  ArrowUpRight 
} from 'lucide-react'

export default function DashboardPage() {
  const stats = [
    { name: 'Total Outstanding', value: '$45,231.89', icon: DollarSign, change: '+20.1%', color: 'text-blue-600' },
    { name: 'Recovery Rate', value: '64.5%', icon: BarChart3, change: '+4.5%', color: 'text-green-600' },
    { name: 'Total Recovered', value: '$12,405.00', icon: Users, change: '+12.5%', color: 'text-indigo-600' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome back to Reclaim AI.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-slate-500">
                <span className={stat.color}>{stat.change}</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Invoice #INV-00{i} paid</p>
                    <p className="text-sm text-slate-500">Customer: Client {i}</p>
                  </div>
                  <div className="ml-auto font-medium">+$250.00</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Sequence Step {i} due</p>
                    <p className="text-sm text-slate-500">Invoice: #INV-10{i}</p>
                  </div>
                  <ArrowUpRight className="ml-auto h-4 w-4 text-slate-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
