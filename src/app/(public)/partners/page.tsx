import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  ArrowRight, 
  DollarSign, 
  Users, 
  BarChart3, 
  Gift, 
  Zap, 
  CheckCircle2, 
  Star, 
  Percent,
  TrendingUp,
  Clock
} from 'lucide-react'

export const metadata = {
  title: 'Partner Program — Reclaim AI',
  description: 'Earn 40% lifetime recurring commissions by referring freelancers and small businesses to Reclaim AI. Join our affiliate partner program today.',
  openGraph: {
    title: 'Reclaim AI Partner Program — Earn 40% Lifetime Commission',
    description: 'Refer freelancers and small businesses to Reclaim AI and earn 40% recurring commissions — $11.60/mo per Standard refer, $31.60/mo per Premium refer.',
  },
}

const commissionTiers = [
  {
    plan: 'Standard',
    price: '$29',
    perMonth: '$11.60',
    perYear: '$139.20',
    icon: Star,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    badge: 'Most Popular',
  },
  {
    plan: 'Premium',
    price: '$79',
    perMonth: '$31.60',
    perYear: '$379.20',
    icon: Zap,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    badge: 'Highest Payout',
  },
]

const benefits = [
  {
    icon: Clock,
    title: 'Lifetime Recurring Commissions',
    description: 'Earn passive income every month for as long as your referral stays a customer. Not a one-time payout — you keep earning.',
  },
  {
    icon: Percent,
    title: '40% Revenue Share',
    description: 'You get 40% of every subscription payment. Standard pays you $11.60/month, Premium pays $31.60/month. Scale up with more referrals.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Dashboard',
    description: 'Track clicks, signups, and commissions in real time through your Rewardful dashboard. Full transparency on every conversion.',
  },
  {
    icon: Gift,
    title: 'Quick & Easy Setup',
    description: 'Get your unique affiliate link in minutes. Share it on social media, your blog, your newsletter, or directly with freelancers who need better invoice recovery.',
  },
  {
    icon: Users,
    title: 'High-Converting Product',
    description: 'Reclaim AI solves a real pain point — $29/mo to recover thousands in past-due invoices. Freelancers who try it stay on it. Low churn = long-term payouts for you.',
  },
  {
    icon: DollarSign,
    title: 'No Cap on Earnings',
    description: 'The more you refer, the more you earn. No ceiling. A single Premium referral earns you $379.20/year. Ten referrals? $3,792/year. One hundred? You do the math.',
  },
]

const howItWorks = [
  {
    step: '1',
    title: 'Sign Up for Free',
    description: 'Join our partner program through Rewardful. It takes 2 minutes and requires nothing but an email address.',
  },
  {
    step: '2',
    title: 'Get Your Unique Link',
    description: 'We give you a custom referral link to share. Rewardful tracks every click, signup, and conversion automatically.',
  },
  {
    step: '3',
    title: 'Share with Your Network',
    description: 'Post your link on social media, include it in your newsletter, or recommend Reclaim AI to freelancers you know.',
  },
  {
    step: '4',
    title: 'Earn 40% Every Month',
    description: 'When someone signs up through your link and subscribes, you earn 40% of their monthly payment — for life. No cap, no expiry.',
  },
]

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <Link className="flex items-center justify-center" href="/">
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Reclaim AI
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-indigo-600 transition-colors" href="/blog/polite-invoice-payment-reminder">
            Blog
          </Link>
          <Link className="text-sm font-medium hover:text-indigo-600 transition-colors" href="/login">
            Sign In
          </Link>
          <Button asChild variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">
            <Link href="/signup">Get Started</Link>
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium">
              <Gift className="h-4 w-4" />
              Partner Program
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 max-w-3xl leading-tight">
              Earn <span className="text-indigo-600">40% Lifetime</span> Recurring Commissions
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl leading-relaxed">
              Refer freelancers and small businesses to Reclaim AI and earn 40% of every subscription payment — every month, for as long as they stay. No cap. No expiry. Just passive income.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 text-base">
                <Link href="https://r.wdfl.co/join" target="_blank" rel="noopener noreferrer">
                  Join the Partner Program
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base border-slate-300">
                <Link href="#how-it-works">
                  How It Works
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Commission Calculator */}
      <section className="w-full py-16 md:py-20 border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Your Commission at a Glance</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Every subscription pays you 40%. Here&apos;s exactly what that looks like.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {commissionTiers.map((tier) => {
              const Icon = tier.icon
              return (
                <div
                  key={tier.plan}
                  className={`rounded-2xl border-2 p-8 shadow-sm transition-shadow hover:shadow-md ${
                    tier.plan === 'Premium' ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-3 rounded-xl ${tier.bg}`}>
                      <Icon className={`h-7 w-7 ${tier.color}`} />
                    </div>
                    {tier.plan === 'Premium' && (
                      <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Best Value
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">{tier.plan} Plan</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-5xl font-extrabold text-slate-900">{tier.price}</span>
                    <span className="text-slate-500">/mo per customer</span>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                      <span className="text-slate-600">Your commission (40%)</span>
                      <span className="text-xl font-bold text-emerald-600">{tier.perMonth}<span className="text-sm font-normal text-slate-500">/mo</span></span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                      <span className="text-slate-600">Yearly earnings per referral</span>
                      <span className="text-xl font-bold text-emerald-600">{tier.perYear}<span className="text-sm font-normal text-slate-500">/yr</span></span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-slate-600">10 referrals yearly</span>
                      <span className="text-xl font-bold text-indigo-600">
                        ${(parseInt(tier.perYear.replace(',', '')) * 10).toLocaleString()}
                        <span className="text-sm font-normal text-slate-500">/yr</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-slate-400">
              All payouts are processed automatically through Rewardful. No minimum payout threshold.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="w-full py-16 md:py-20 border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why Partner with Reclaim AI?</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              We built the partner program around one principle: you should earn as long as your referral stays a customer.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div
                  key={benefit.title}
                  className="rounded-xl border border-slate-200 p-6 hover:border-indigo-200 hover:shadow-sm transition-all bg-white"
                >
                  <div className="p-2.5 bg-indigo-50 rounded-lg w-fit mb-4">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="w-full py-16 md:py-20 border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Getting started takes minutes. The earnings keep coming.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            {howItWorks.map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-lg shrink-0">
                  {item.step}
                </div>
                <div className="pt-2">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-slate-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / Trust Section */}
      <section className="w-full py-16 md:py-20 bg-slate-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1 text-amber-400 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-current" />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl font-medium text-slate-700 leading-relaxed mb-6">
              &ldquo;Reclaim AI has been a game-changer for my freelance clients. I recommended it to 5 people in my network — four of them signed up and are still paying customers 8 months later. That&apos;s over $200/month in passive income from a single recommendation.&rdquo;
            </blockquote>
            <p className="text-sm text-slate-500">
              — Alex M., Freelance Community Leader &amp; Reclaim AI Partner
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-10 md:p-14 shadow-lg">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <TrendingUp className="h-4 w-4" />
              Start Earning Today
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Turn Your Network Into Revenue?
            </h2>
            <p className="text-indigo-100 text-base md:text-lg mb-8 max-w-lg mx-auto">
              Join our partner program for free. Get your unique referral link in minutes and start earning 40% lifetime recurring commissions — no cap, no expiry.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold h-12 px-8">
                <Link href="https://r.wdfl.co/join" target="_blank" rel="noopener noreferrer">
                  Join the Partner Program
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-indigo-400 text-white hover:bg-indigo-600/50 h-12 px-8">
                <Link href="/">
                  Learn About Reclaim AI
                </Link>
              </Button>
            </div>
            <p className="text-xs text-indigo-200 mt-4">
              Free to join. No minimum payout. Payouts processed automatically via Rewardful.
            </p>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Reclaim AI. All rights reserved.
            </p>
            <nav className="flex items-center gap-6">
              <Link className="text-sm text-slate-500 hover:text-slate-700 transition-colors" href="/blog/polite-invoice-payment-reminder">
                Blog
              </Link>
              <Link className="text-sm text-slate-500 hover:text-slate-700 transition-colors" href="/privacy">
                Privacy
              </Link>
              <Link className="text-sm text-slate-500 hover:text-slate-700 transition-colors" href="/terms">
                Terms
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
