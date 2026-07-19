import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Copy, CheckCircle2, FileText } from 'lucide-react'

export const metadata = {
  title: 'Polite Invoice Payment Reminder: 3 Email Templates for Freelancers',
  description: 'Three copy-paste polite invoice payment reminder email templates for freelancers and small agencies — plus the cadence and tone that actually get clients to pay without damaging the relationship.',
  openGraph: {
    title: 'Polite Invoice Payment Reminder: 3 Email Templates for Freelancers',
    description: 'Three copy-paste polite invoice payment reminder email templates for freelancers and small agencies.',
    url: 'https://9a291871c35296460e818c18adfc8161.ctonew.app/blog/polite-invoice-payment-reminder',
    type: 'article',
    publishedTime: '2026-07-08',
  },
  keywords: ['polite invoice payment reminder', 'freelance late client follow-up', 'past due invoice email template', 'dunning email template freelancer', 'how to politely remind a client to pay'],
}

function TemplateBlock({ number, day, subject, subjectLabel, children }: { number: number; day: string; subject: string; subjectLabel: string; children: React.ReactNode }) {
  return (
    <div className="my-10 rounded-xl border border-indigo-100 bg-white shadow-sm overflow-hidden" id={`template-${number}`}>
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-indigo-100">
        <div className="flex items-center gap-3 mb-1">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold shrink-0">
            {number}
          </span>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Template {number}: {day}</h3>
            <p className="text-sm text-slate-500">{subjectLabel}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-4">
        <div className="mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Subject line</span>
          <p className="text-sm font-mono text-indigo-700 bg-indigo-50/50 rounded px-3 py-2 mt-1 border border-indigo-100">
            {subject}
          </p>
        </div>
        <div className="bg-slate-900 rounded-lg p-5 text-slate-100 font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {children}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Copy className="h-3 w-3" />
          <span>Copy this template and customize with your details</span>
        </div>
      </div>
    </div>
  )
}

function CTABanner() {
  return (
    <div className="my-12 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-8 md:p-10 text-white shadow-lg">
      <div className="max-w-xl mx-auto text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <FileText className="h-6 w-6 text-indigo-200" />
          <span className="text-sm font-medium text-indigo-200 uppercase tracking-wider">Automate It</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">Stop chasing payments. Let Reclaim AI do it for you.</h2>
        <p className="text-indigo-100 text-sm md:text-base leading-relaxed">
          Reclaim AI connects to Stripe and QuickBooks, runs this exact three-step sequence on autopilot, and stops the moment the invoice clears. Same polite tone. Zero awkwardness. $29/month or 0.5% of recovered revenue.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold px-8">
            <Link href="/signup">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-indigo-400 text-white hover:bg-indigo-600/50 px-8">
            <Link href="/">
              Learn More
            </Link>
          </Button>
        </div>
        <p className="text-xs text-indigo-200">Free until it works. No credit card required.</p>
      </div>
    </div>
  )
}

export default function BlogPost() {
  return (
    <div className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 lg:py-20">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center text-sm text-slate-400 hover:text-indigo-600 transition-colors mb-8">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium">Freelance Tips</span>
            <span>July 8, 2026</span>
            <span>·</span>
            <span>8 min read</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Polite Invoice Payment Reminder: 3 Email Templates for Freelancers
          </h1>
          <p className="mt-4 text-lg text-slate-500 leading-relaxed max-w-2xl">
            Three copy-paste email templates for following up on late invoices — plus the cadence and tone that actually get clients to pay without damaging the relationship.
          </p>
        </header>

        {/* Intro */}
        <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-a:text-indigo-600 prose-strong:text-slate-800 text-base leading-relaxed">
          <p className="lead text-lg text-slate-600">
            There&apos;s a specific kind of dread that hits around 9pm on a Tuesday, when you remember you haven&apos;t followed up on the invoice you sent twenty-three days ago. You know you should. The client is a good person. The work was good. It&apos;s almost certainly not malicious — they probably just got busy. You know all of this. And you <em>still</em> can&apos;t bring yourself to write the email.
          </p>

          <p>
            If that sounds familiar, you&apos;re not alone. The freelance late-payment problem isn&apos;t a moral failing. It&apos;s a structural one. Most freelancers lose 5–10% of billable revenue to invoices that go past 60 days, not because clients are trying to skip out, but because nobody has built a system to handle the awkward middle — the part where the polite nudge has to come from a real human who also has to keep working with this client next month.
          </p>

          <p>
            This guide gives you that system. You&apos;ll get a three-step follow-up sequence you can copy, the exact email templates for each step, and a framework for tuning the tone to your relationship with the client. By the end, you&apos;ll have a default process for every invoice — and you&apos;ll never do the 9pm math again.
          </p>

          <h2>Why most polite invoice payment reminders backfire</h2>

          <p>
            Before we get to the templates, it&apos;s worth naming the three things that make a reminder email <em>fail</em> — i.e., get ignored, get a passive-aggressive reply, or quietly end a client relationship.
          </p>

          <p>
            <strong>1. They come from a place of resentment, even when the words are polite.</strong> If you&apos;ve been stewing on an invoice for three weeks, the &ldquo;just circling back!&rdquo; email reads differently than if you sent it the day after it was due. The recipient might not be able to name what&apos;s off, but they can feel it.
          </p>

          <p>
            <strong>2. They skip steps.</strong> The single biggest mistake is going from &ldquo;no follow-up for 45 days&rdquo; straight to &ldquo;this is now 30 days past due, please remit immediately.&rdquo; That jump is what makes the freelancer feel confrontational, and the client feel ambushed. Reminders work as a <em>sequence</em>, not a single event.
          </p>

          <p>
            <strong>3. They sound like templates.</strong> Clients can smell a copy-pasted demand letter from across the room. Worse, they can smell a copy-pasted <em>friendly</em> template too — the &ldquo;Hope this finds you well! Just wanted to circle back&hellip;&rdquo; voice that signals the sender is hiding their real feelings behind pleasantries.
          </p>

          <p>
            The fix for all three is the same: a short, predictable sequence with consistent tone, sent at predictable intervals, written like a real person.
          </p>

          <h2>The 3-step polite invoice payment reminder sequence</h2>

          <p>
            Here&apos;s the framework. The exact day counts are tunable, but the <em>shape</em> of the sequence is the part that matters.
          </p>

          {/* Sequence table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 my-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Step</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Day (after due date)</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tone</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Goal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">1</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">Day 1</td>
                  <td className="px-4 py-3 text-slate-600">Friendly, zero-pressure</td>
                  <td className="px-4 py-3 text-slate-600">&ldquo;Just a heads-up, in case this slipped by.&rdquo;</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">2</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">Day 14</td>
                  <td className="px-4 py-3 text-slate-600">Direct, professional</td>
                  <td className="px-4 py-3 text-slate-600">&ldquo;Here&apos;s the invoice, here&apos;s the link, here&apos;s what I need.&rdquo;</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">3</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">Day 30</td>
                  <td className="px-4 py-3 text-slate-600">Firm, final, kind</td>
                  <td className="px-4 py-3 text-slate-600">&ldquo;This needs to be resolved this week. Here are the options.&rdquo;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-slate-500 italic">
            (If you want a warmer middle check-in around Day 7, send a one-line &ldquo;just checking this didn&apos;t get lost&rdquo; note. The three templates below cover the three structural moments; the cadence in between is up to you.)
          </p>

          <p>
            The psychology: each step is a small escalation in directness, but the <em>emotional temperature</em> never changes. You&apos;re not getting angry. You&apos;re just slowly turning up the volume on the same message. By Day 30, the client has had multiple chances to act, and you&apos;ve made it impossible to claim they didn&apos;t know.
          </p>

          <p>
            You can stop at any step the invoice is paid. If it&apos;s paid after Step 2, you skip Step 3 — that&apos;s the whole point.
          </p>
        </div>

        {/* Template 1 */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Copy-Paste Templates</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </div>

        <TemplateBlock number={1} day="Day 1 — The friendly heads-up" subject="Quick note on invoice #[number]" subjectLabel="Send this the day after the due date. Don&apos;t wait.">
{`Hi [First name],

Hope you're well. Just a quick note that invoice #[number] for [project name] was due yesterday — totally possible it just slipped through the cracks on your end.

In case it's useful: [payment link]

No action needed if it's already in flight — just wanted to make sure it didn't get lost in an inbox.

Thanks!
[Your name]`}
        </TemplateBlock>

        <div className="prose prose-slate max-w-none prose-headings:text-slate-900">
          <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 border border-slate-200">
            <strong>Why this works:</strong> It assumes goodwill. It gives the client a face-saving explanation (&ldquo;slipped through the cracks&rdquo;). It contains the payment link without making them scroll. There&apos;s no implied accusation. This is the entire foundation of a polite invoice payment reminder — start generous, escalate only as needed.
          </p>
        </div>

        {/* Template 2 */}
        <TemplateBlock number={2} day="Day 14 — The direct, professional ask" subject="Invoice #[number] — 14 days past due" subjectLabel="Two weeks past due. Switch to a clear, professional tone.">
{`Hi [First name],

Invoice #[number] for [project name] is now 14 days past due. The total is [amount], and the payment link is below.

[Payment link]

If payment has been sent, please ignore this — sometimes the notification lag is longer than the email lag.

If there's an issue blocking payment, I'd appreciate a quick reply so we can sort it out.

Thanks,
[Your name]
[Business name]
[Phone number]`}
        </TemplateBlock>

        <div className="prose prose-slate max-w-none prose-headings:text-slate-900">
          <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 border border-slate-200">
            <strong>Why this works:</strong> It states the facts, includes the link, and gives the client two easy off-ramps (&ldquo;already paid&rdquo; / &ldquo;let me know what&apos;s blocking&rdquo;). The phone number is a deliberate trust signal — it says &ldquo;I&apos;m a real business, you can call me.&rdquo; Drop the emoji. Drop the friendly opener. Direct is <em>more</em> respectful at this point, not less. This is the single most important template in the entire polite collection email sequence — most late invoices that <em>can</em> be recovered, get recovered at this step.
          </p>
        </div>

        {/* Template 3 */}
        <TemplateBlock number={3} day="Day 30 — The firm, kind, final notice" subject="Final notice — invoice #[number]" subjectLabel="Thirty days past due. Your last email before escalation.">
{`Hi [First name],

Invoice #[number] for [project name], originally due on [date], is now 30 days past due.

To resolve this, you can:
• Pay the full amount now: [payment link]
• Reply with a payment date you can commit to, and I'll honor it

If I don't hear back by [specific date 5 business days out], I'll have to pause active work on the project until the invoice is settled. I'd rather not do that — please reply so we can keep things moving.

[Your name]
[Business name]
[Phone number]`}
        </TemplateBlock>

        <div className="prose prose-slate max-w-none prose-headings:text-slate-900">
          <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 border border-slate-200">
            <strong>Why this works:</strong> It states a specific consequence with a specific date. Vague threats (&ldquo;I may have to reconsider our arrangement&rdquo;) are easy to ignore. A date is not. The two clear options (&ldquo;pay now&rdquo; / &ldquo;give me a date&rdquo;) give the client a non-confrontational way to respond. The closing line (&ldquo;I&apos;d rather not do that&rdquo;) preserves the relationship while keeping the stakes clear.
          </p>
        </div>

        {/* Subject lines section */}
        <div className="prose prose-slate max-w-none prose-headings:text-slate-900 mt-12">
          <h2>Subject line formulas that get opened</h2>

          <p>
            The best email body in the world is useless if the subject line gets archived. Here are five subject line formulas that consistently get past the &ldquo;I&apos;ll deal with this later&rdquo; filter:
          </p>

          <ul>
            <li><strong>Invoice #[number] — [X] days past due</strong> (the Day 14 / Day 30 workhorse)</li>
            <li><strong>Quick note on invoice #[number]</strong> (the Day 1 default)</li>
            <li><strong>Following up — invoice #[number]</strong></li>
            <li><strong>Checking in on invoice #[number]</strong></li>
            <li><strong>Payment received for invoice #[number]</strong> (always send a &ldquo;thanks, paid&rdquo; email — it closes the loop and primes future invoices)</li>
          </ul>

          <p>
            Avoid: &ldquo;URGENT&rdquo;, &ldquo;FINAL NOTICE&rdquo; in all caps, &ldquo;Action required&rdquo;, red exclamation marks, and anything that looks like a demand letter. These trigger spam filters <em>and</em> the recipient&apos;s threat response — exactly the opposite of a polite invoice payment reminder.
          </p>

          <h2>Common mistakes to avoid</h2>

          <ul>
            <li><strong>Don&apos;t apologize for asking to be paid.</strong> &ldquo;Sorry to bother you about this&rdquo; is the most common phrase in freelancer dunning emails and it actively weakens your position. You&apos;re not bothering them. They signed a contract.</li>
            <li><strong>Don&apos;t over-explain.</strong> One or two sentences on context is plenty. Three paragraphs about your own cash flow is a turn-off and reads as guilt-tripping.</li>
            <li><strong>Don&apos;t personalize the late payment.</strong> &ldquo;I noticed you usually pay right away, so this is unusual&hellip;&rdquo; makes the client feel surveilled. Just send the email.</li>
            <li><strong>Don&apos;t skip Template 1 because you feel awkward.</strong> The Day 1 nudge is the single most effective email in the entire sequence, and the one freelancers most often skip. Send it.</li>
            <li><strong>Don&apos;t send from a no-reply address.</strong> If your polite invoice payment reminder comes from <code>billing@noreply.com</code>, the client has no human to reply to, and you&apos;ve removed the easiest path to resolution.</li>
          </ul>

          <h2>What to do with this sequence</h2>

          <p>
            You have two options.
          </p>

          <p>
            <strong>Option A: Manually.</strong> Put the three templates into a notes app. Every Friday, run the sequence against your outstanding invoices: who got the nudge this week, who needs the direct ask, who needs the final notice. Mark each invoice with its step. The whole thing takes 15–30 minutes per week, and recovers the vast majority of invoices that <em>can</em> be recovered.
          </p>

          <p>
            <strong>Option B: Automate it.</strong> If you have more than a handful of outstanding invoices at any given time, the manual version starts to fall apart — you&apos;ll forget, you&apos;ll get behind, you&apos;ll avoid it. This is exactly why we built <Link href="/" className="text-indigo-600 font-medium hover:text-indigo-700 underline">Reclaim AI</Link>. It connects to Stripe and QuickBooks, runs this exact three-step sequence on autopilot, and stops the moment the invoice clears. The email tone is the same one in this guide — warm, professional, never aggressive. It costs $29/month or 0.5% of recovered revenue, whichever is greater. Free until it works.
          </p>

          <p>
            Whichever option you pick, the important thing is to have a default. The freelancers who get paid on time aren&apos;t the ones with better clients — they&apos;re the ones with a system that doesn&apos;t depend on whether they happen to feel brave on a given Tuesday.
          </p>

          <h2>Frequently asked questions</h2>

          <div className="space-y-6 my-6">
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-2">What if the client just doesn&apos;t respond to any of the three emails?</h3>
              <p className="text-sm text-slate-600">After Template 3, your options are: pause active work on the project (the most common), send to a third-party collections agency (rare for the freelancer-to-client relationship), or write it off as a bad debt and learn the lesson. Most freelancers do a combination: they pause work, then write it off only if the amount is below the cost of pursuing it further.</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-2">Should I send these from my personal email or a business address?</h3>
              <p className="text-sm text-slate-600">Whichever one the client knows and trusts. If your client signed a contract with <code>hello@yourbusiness.com</code>, send the polite invoice payment reminder from the same address. Continuity matters more than a &ldquo;billing@&rdquo; alias.</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-2">Can I customize the tone to be more formal / more friendly?</h3>
              <p className="text-sm text-slate-600">Yes — the three-step <em>shape</em> is the part that works. The exact wording should match your relationship. A two-year retainer client with a friendship underneath the contract deserves a softer Template 2 than a one-off project client you barely know. Tune the words, keep the cadence.</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-2">What if I want to offer a payment plan?</h3>
              <p className="text-sm text-slate-600">Add it to Template 2 or Template 3: &ldquo;If a payment plan would help, here&apos;s what I can do — 50% this week, 50% in 30 days.&rdquo; This is often the fastest path to actually getting paid, and most clients will only ask if you offer.</p>
            </div>
          </div>

          <CTABanner />
        </div>
      </article>
    </div>
  )
}
