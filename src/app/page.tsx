import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase-server'
import { 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Mail, 
  BarChart3,
  ShieldCheck,
  CreditCard
} from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navigation */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <Link className="flex items-center justify-center" href="/">
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Reclaim AI
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          {user ? (
            <Button asChild variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Link className="text-sm font-medium hover:text-indigo-600 transition-colors" href="/login">
                Sign In
              </Link>
              <Button asChild variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-slate-50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none max-w-3xl mx-auto text-slate-900">
                  Get Paid Without the <span className="text-indigo-600">Manual Effort</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-slate-500 md:text-xl mt-6">
                  Turn past-due invoices into recovered revenue with AI-powered, professional email sequences. Connect your data and let Reclaim AI handle the rest.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 text-lg text-white border-none">
                  <Link href="/signup">
                    Start Recovering Now <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-lg">
                  <Link href="/login">View Demo</Link>
                </Button>
              </div>
              <p className="text-sm text-slate-400 mt-4">
                No credit card required. Free 14-day trial.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-slate-900">Set it and Forget it</h2>
                <p className="max-w-[900px] text-slate-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mt-4">
                  We integrate directly with your accounting software to monitor payments and automate recoveries.
                </p>
              </div>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-slate-100 bg-slate-50/50">
                <CardHeader className="flex flex-col items-center space-y-2">
                  <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                    <Zap className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-bold">One-Click Integration</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-slate-500">
                  Connect Stripe or QuickBooks in seconds. We'll automatically pull in your outstanding invoices.
                </CardContent>
              </Card>
              <Card className="border-slate-100 bg-slate-50/50">
                <CardHeader className="flex flex-col items-center space-y-2">
                  <div className="p-3 bg-violet-100 rounded-full text-violet-600">
                    <Mail className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-bold">AI Personalization</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-slate-500">
                  Our AI writes personalized emails that sound like you, maintaining relationships while getting you paid.
                </CardContent>
              </Card>
              <Card className="border-slate-100 bg-slate-50/50">
                <CardHeader className="flex flex-col items-center space-y-2">
                  <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-bold">Smart Scheduling</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-slate-500">
                  Automated dunning sequences that escalate professionally based on payment status.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-slate-50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-slate-900">How it Works</h2>
              <p className="max-w-[700px] text-slate-500 md:text-xl mt-4">
                Three simple steps to automate your collections.
              </p>
            </div>
            <div className="grid gap-12 lg:grid-cols-3 items-start">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white text-2xl font-bold shadow-lg shadow-indigo-200">
                  1
                </div>
                <h3 className="text-xl font-bold">Connect Your Data</h3>
                <p className="text-slate-500">
                  Securely link Stripe or QuickBooks. We sync your outstanding invoices automatically.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white text-2xl font-bold shadow-lg shadow-indigo-200">
                  2
                </div>
                <h3 className="text-xl font-bold">AI Personalization</h3>
                <p className="text-slate-500">
                  Our AI analyzes the relationship and invoice details to craft the perfect recovery sequence.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white text-2xl font-bold shadow-lg shadow-indigo-200">
                  3
                </div>
                <h3 className="text-xl font-bold">Automatic Recovery</h3>
                <p className="text-slate-500">
                  Sit back as Reclaim AI sends smart follow-ups and notifies you the moment you get paid.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-slate-900">Simple Pricing</h2>
              <p className="max-w-[600px] text-slate-500 md:text-xl">
                Choose the plan that fits your business needs.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              <Card className="flex flex-col p-8 border-2 border-slate-200 bg-white">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">Standard</h3>
                  <p className="text-slate-500 text-sm">Perfect for freelancers and small agencies.</p>
                </div>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-slate-900">$29</span>
                  <span className="text-slate-500">/mo</span>
                  <p className="text-xs text-slate-400 mt-1">OR 0.5% of recovered revenue</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Up to 50 invoices/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>AI Personalization</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Stripe & QuickBooks Sync</span>
                  </li>
                </ul>
                <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 text-white border-none">
                  <Link href="/signup">Get Started</Link>
                </Button>
              </Card>
              <Card className="flex flex-col p-8 border-2 border-indigo-600 relative overflow-hidden bg-white">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                  Popular
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">Premium</h3>
                  <p className="text-slate-500 text-sm">For growing teams needing more control.</p>
                </div>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-slate-900">$79</span>
                  <span className="text-slate-500">/mo</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Unlimited Invoices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Multi-user Access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>White-labeled Emails</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Advanced Reporting</span>
                  </li>
                </ul>
                <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                  <Link href="/signup">Get Started</Link>
                </Button>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-indigo-600 text-white">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl mb-6">
              Ready to recover your revenue?
            </h2>
            <p className="mx-auto max-w-[600px] text-indigo-100 md:text-xl mb-10">
              Join hundreds of businesses using Reclaim AI to automate their collections and focus on what matters.
            </p>
            <Button asChild size="lg" className="bg-white text-indigo-600 hover:bg-slate-100 h-14 px-10 text-xl font-bold border-none">
              <Link href="/signup">
                Create Your Free Account
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-slate-100 bg-white">
        <p className="text-xs text-slate-500">
          © 2026 Reclaim AI. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4 text-slate-500" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4 text-slate-500" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
