import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-server'
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Mail,
  BarChart3,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Star,
  ChevronRight,
} from 'lucide-react'

/* ─── Email mockup data ─────────────────────────────────────────── */
const MOCK_EMAILS = [
  {
    day: 'Day 1',
    status: '✓ Paid',
    statusColor: 'text-emerald-500',
    subject: 'Quick note on invoice #1042',
    snippet: 'Hope you\'re well. Just a quick note that invoice #1042 was due yesterday — totally possible it slipped through.',
    sender: 'Reclaim AI',
    time: '9:32 AM',
    paid: true,
  },
  {
    day: 'Day 14',
    status: 'Sent',
    statusColor: 'text-amber-500',
    subject: 'Invoice #1042 — 14 days past due',
    snippet: 'Invoice #1042 is now 14 days past due. The total is $2,400, and the payment link is below.',
    sender: 'Reclaim AI',
    time: '9:32 AM',
    paid: false,
  },
  {
    day: 'Day 30',
    status: 'Scheduled',
    statusColor: 'text-slate-400',
    subject: 'Final notice — invoice #1042',
    snippet: 'Invoice #1042 is now 30 days past due. To resolve this, you can pay the full amount now...',
    sender: 'Reclaim AI',
    time: '—',
    paid: false,
  },
]

/* ─── Reusable section wrapper ──────────────────────────────────── */
function Section({
  id,
  className = '',
  children,
}: {
  id?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className={`w-full py-20 md:py-28 lg:py-36 ${className}`}>
      <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-12">{children}</div>
    </section>
  )
}

/* ─── Product mockup (email sequence card) ──────────────────────── */
function EmailSequenceMockup() {
  return (
    <div className="relative mt-14 w-full max-w-2xl mx-auto">
      {/* Subtle glow behind */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-indigo-500/10 via-violet-500/5 to-transparent blur-3xl" />

      {/* Card */}
      <div className="relative rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-xl shadow-slate-900/5 overflow-hidden">
        {/* Mock window chrome */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="ml-4 rounded-md bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-400 tracking-tight">
            app.reclaim-ai.io/dashboard/campaigns
          </div>
        </div>

        {/* Mock email list */}
        <div className="divide-y divide-slate-50">
          {MOCK_EMAILS.map((email, i) => (
            <div
              key={i}
              className={`group flex items-start gap-4 px-5 py-4 transition-all hover:bg-slate-50/80 ${
                email.paid ? 'bg-emerald-50/40' : ''
              }`}
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white shadow-sm">
                RA
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {email.subject}
                  </span>
                  {email.paid && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Paid
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">{email.snippet}</p>
              </div>

              {/* Right side */}
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] font-medium text-slate-400">{email.day}</span>
                <span className={`text-[10px] font-medium ${email.statusColor}`}>
                  {email.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <span className="text-[11px] text-slate-400">3 emails in sequence — auto-stops when paid</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600">
            <Sparkles className="h-3 w-3" />
            AI-powered
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Feature card ──────────────────────────────────────────────── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
}: {
  icon: React.ElementType
  title: string
  description: string
  gradient: string
}) {
  return (
    <div className="group relative rounded-2xl border border-slate-200/70 bg-white/60 backdrop-blur-sm p-7 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/80 hover:shadow-lg hover:shadow-slate-900/5">
      {/* Hover gradient accent */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-slate-50/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

      <div className={`relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${gradient} shadow-sm`}>
        <Icon className="h-5.5 w-5.5 text-white" />
      </div>
      <h3 className="relative text-base font-semibold text-slate-900">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  )
}

/* ─── Step timeline ─────────────────────────────────────────────── */
function Step({
  number,
  title,
  description,
  isLast = false,
}: {
  number: string
  title: string
  description: string
  isLast?: boolean
}) {
  return (
    <div className="relative flex gap-6">
      {!isLast && (
        <div className="absolute left-[19px] top-12 h-full w-px bg-gradient-to-b from-indigo-200 to-slate-100" />
      )}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-indigo-200 bg-white text-sm font-bold text-indigo-600 shadow-sm">
        {number}
      </div>
      <div className="pb-12">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 max-w-md">{description}</p>
      </div>
    </div>
  )
}

/* ─── Pricing card ──────────────────────────────────────────────── */
function PricingCard({
  name,
  price,
  description,
  features,
  cta,
  highlighted = false,
}: {
  name: string
  price: string
  description: string
  features: { text: string; included: boolean }[]
  cta: { label: string; href: string }
  highlighted?: boolean
}) {
  if (highlighted) {
    return (
      <div className="relative flex flex-col rounded-2xl border border-indigo-200/60 bg-gradient-to-b from-slate-900 to-slate-800 p-8 shadow-2xl shadow-indigo-500/10">
        <div className="absolute -top-px left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-60" />
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-300" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-300">Premium</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight text-white">{price}</span>
          <span className="text-sm text-slate-400">/month</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
        <ul className="mt-6 space-y-3 flex-1">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              {f.included ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-600" />
              )}
              <span className={f.included ? 'text-slate-200' : 'text-slate-500'}>{f.text}</span>
            </li>
          ))}
        </ul>
        <Button asChild className="mt-8 w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold shadow-sm">
          <Link href={cta.href}>
            {cta.label}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-slate-900">{price}</span>
        <span className="text-sm text-slate-400">/month</span>
      </div>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <ul className="mt-6 space-y-3 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            {f.included ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-300" />
            )}
            <span className={f.included ? 'text-slate-700' : 'text-slate-400'}>{f.text}</span>
          </li>
        ))}
      </ul>
      <Button asChild variant="outline" className="mt-8 w-full border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium">
        <Link href={cta.href}>{cta.label}</Link>
      </Button>
    </div>
  )
}

/* ─── Landing page ──────────────────────────────────────────────── */
export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ═══ Navigation ═══ */}
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 md:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
              <span className="text-[10px] font-bold text-white">R</span>
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              Reclaim<span className="text-indigo-600">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              How It Works
            </Link>
            <Link href="#pricing" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Pricing
            </Link>
            <Link href="/partners" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Partners
            </Link>
            <Link href="/blog/polite-invoice-payment-reminder" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Blog
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-9 px-5 text-sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link
                  href="/demo"
                  className="hidden sm:inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Try Demo
                </Link>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-9 px-5 text-sm">
                  <Link href="/signup">
                    Get Started
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ═══ Hero ═══ */}
        <Section className="pt-28 md:pt-36 lg:pt-44 pb-16 md:pb-20 lg:pb-24 bg-gradient-to-b from-slate-50 via-white to-white">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-indigo-50/60 px-4 py-1.5 text-xs font-medium text-indigo-700 shadow-sm mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered invoice recovery
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.08] max-w-4xl">
              Get paid{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                without chasing
              </span>
              <br />
              <span className="text-slate-500 font-medium">Your invoices, recovered automatically.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-slate-500">
              Reclaim AI watches your Stripe and QuickBooks accounts, finds past-due invoices, and sends warm,
              personalized follow-up emails until they&apos;re paid — so you never have to send an awkward reminder again.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <Button asChild className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 px-7 text-sm font-medium">
                <Link href="/signup">
                  Start your free trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-7 text-sm font-medium">
                <Link href="/demo">
                  Try the demo
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 border-slate-300 text-slate-700 hover:bg-slate-50 px-7 text-sm font-medium">
                <Link href="#features">
                  See how it works
                </Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-slate-400">No credit card required · Free 14-day trial · Cancel anytime</p>

            {/* Product mockup */}
            <EmailSequenceMockup />
          </div>
        </Section>

        {/* ═══ Trust bar ═══ */}
        <Section className="py-12 md:py-16 border-t border-slate-100 bg-white">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-slate-400">
            <span className="font-medium text-slate-500 tracking-tight">Used by freelancers &amp; agencies on</span>
            <span className="font-semibold text-slate-700">Stripe</span>
            <span className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="font-semibold text-slate-700">QuickBooks</span>
            <span className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="font-semibold text-slate-700">Xero</span>
          </div>
        </Section>

        {/* ═══ Features ═══ */}
        <Section id="features" className="bg-slate-50/60 border-t border-slate-100">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-4">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Set it and never think about it again
            </h2>
            <p className="mt-4 text-base text-slate-500 leading-relaxed">
              Reclaim AI connects directly to your accounting stack and handles the entire collections workflow —
              from first nudge to final notice — while you focus on your work.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Zap}
              title="One-Click Integration"
              description="Connect Stripe or QuickBooks in seconds with secure OAuth. We automatically sync your outstanding invoices."
              gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
            />
            <FeatureCard
              icon={Sparkles}
              title="AI Personalization"
              description="Our AI crafts unique, context-aware emails personalized with your client's name, project, and tone."
              gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            />
            <FeatureCard
              icon={CheckCircle2}
              title="Smart Scheduling"
              description="Three-step escalation sequence — friendly nudge, direct ask, final notice. Auto-stops the moment payment clears."
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <FeatureCard
              icon={Mail}
              title="White-Label Deliverability"
              description="Send from your own verified domain with full DKIM/SPF/DMARC. No 'sent via Reclaim' branding on Premium."
              gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            />
            <FeatureCard
              icon={BarChart3}
              title="Real-Time Analytics"
              description="Dashboard shows recovery rate, total recovered revenue, campaign status, and integration health at a glance."
              gradient="bg-gradient-to-br from-cyan-500 to-sky-600"
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Relationship-Preserving"
              description="Polite, professional tone tuned to maintain client relationships. Your clients stay clients — even after a reminder."
              gradient="bg-gradient-to-br from-rose-500 to-pink-600"
            />
          </div>
        </Section>

        {/* ═══ How It Works ═══ */}
        <Section id="how-it-works" className="bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-4">How It Works</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                Three steps to automated recovery
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-start">
              <div className="pt-2">
                <Step number="1" title="Connect your data" description="Securely link Stripe, QuickBooks, or Xero. We scan for overdue invoices and build a recovery queue automatically." />
                <Step number="2" title="AI crafts the sequence" description="Our engine generates personalized emails for each invoice — from a friendly Day-1 nudge to a firm Day-30 notice." />
                <Step number="3" title="Get paid. Move on." description="Emails are sent on schedule. The moment Stripe marks the invoice paid, the sequence stops. You get a notification. That's it." isLast />
              </div>

              <div className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50/60 p-8 md:p-10">
                <div className="text-5xl md:text-6xl font-bold tracking-tight text-indigo-600">5–10%</div>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  of billable revenue is lost to invoices that go past 60 days. Most freelancers don't have a system — they just avoid the awkward conversation. Reclaim AI is that system.
                </p>
                <div className="mt-6 flex items-center gap-3 border-t border-slate-200 pt-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Average recovery rate</p>
                    <p className="text-xs text-slate-400">83% of invoices recovered within 30 days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══ Pricing ═══ */}
        <Section id="pricing" className="bg-slate-50/60 border-t border-slate-100">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-4">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-base text-slate-500 leading-relaxed">
              Start free. Pay only when you start recovering revenue.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <PricingCard
              name="Standard"
              price="$29"
              description="For freelancers and small service businesses."
              features={[
                { text: 'Up to 50 invoices/month', included: true },
                { text: 'AI-powered email sequences', included: true },
                { text: 'Stripe & QuickBooks sync', included: true },
                { text: 'Dashboard analytics', included: true },
                { text: 'Custom domain sending', included: false },
                { text: 'Multi-user team access', included: false },
                { text: 'White-label branding', included: false },
              ]}
              cta={{ label: 'Get Started', href: '/signup' }}
            />

            <PricingCard
              name="Premium"
              price="$79"
              description="For growing agencies that need full control."
              highlighted
              features={[
                { text: 'Unlimited invoices', included: true },
                { text: 'AI-powered email sequences', included: true },
                { text: 'Stripe & QuickBooks sync', included: true },
                { text: 'Advanced reporting & analytics', included: true },
                { text: 'White-label email branding', included: true },
                { text: 'Custom domain (DKIM/SPF)', included: true },
                { text: 'Multi-user team access', included: true },
              ]}
              cta={{ label: 'Start Free Trial', href: '/signup' }}
            />
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            All plans available as $29/month flat OR 0.5% of recovered revenue (whichever is greater).
          </p>
        </Section>

        {/* ═══ CTA ═══ */}
        <Section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />

          <div className="relative text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Start recovering today
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Ready to stop chasing payments?
            </h2>
            <p className="mt-5 text-base md:text-lg text-indigo-100 leading-relaxed max-w-lg mx-auto">
              Join hundreds of freelancers and agencies using Reclaim AI to recover revenue automatically. Free 14-day trial — no risk, no commitment.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild className="h-11 bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg shadow-indigo-900/20 px-7 text-sm font-semibold">
                <Link href="/signup">
                  Create your free account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 border-white/20 text-white hover:bg-white/10 px-7 text-sm font-medium">
                <Link href="#features">
                  Learn more
                </Link>
              </Button>
            </div>
          </div>
        </Section>
      </main>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-12 py-10">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
                  <span className="text-[8px] font-bold text-white">R</span>
                </div>
                <span className="text-sm font-bold tracking-tight text-slate-900">
                  Reclaim<span className="text-indigo-600">AI</span>
                </span>
              </Link>
              <p className="mt-2 text-xs text-slate-400 max-w-xs">
                Automated, AI-powered invoice recovery for freelancers and small businesses.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</p>
                <div className="flex flex-col gap-1.5">
                  <Link href="#features" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Features</Link>
                  <Link href="#pricing" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Pricing</Link>
                  <Link href="/partners" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Partners</Link>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resources</p>
                <div className="flex flex-col gap-1.5">
                  <Link href="/blog/polite-invoice-payment-reminder" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Blog</Link>
                  <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Privacy</Link>
                  <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Terms</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Reclaim AI. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Built for freelancers, by freelancers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
