import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service - Reclaim AI",
  description: "Terms of Service for Reclaim AI's automated invoice recovery platform.",
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose prose-slate">
      <h1>Terms of Service</h1>
      <p className="text-sm text-slate-500">Last updated: June 27, 2026</p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using Reclaim AI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Reclaim AI provides an automated invoice recovery platform that connects to your Stripe or QuickBooks account to send personalized dunning (payment reminder) emails to your customers with past-due invoices.
      </p>

      <h2>3. Account Registration</h2>
      <p>
        You must create an account to use the Service. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.
      </p>

      <h2>4. Connected Accounts</h2>
      <p>
        By connecting Stripe or QuickBooks, you authorize Reclaim AI to read invoice data and send communications on your behalf. You represent that you have the legal authority to authorize such access. You may revoke access at any time via your account settings.
      </p>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
        <li>Send deceptive, fraudulent, or misleading communications through the platform</li>
        <li>Impersonate any person or entity through the dunning communications</li>
        <li>Attempt to access another user's account or data without authorization</li>
        <li>Use the Service to harass, threaten, or intimidate debtors</li>
      </ul>

      <h2>6. AI-Generated Content</h2>
      <p>
        Reclaim AI uses OpenAI's GPT-4o-mini to personalize email content based on invoice data. We implement strict content guidelines requiring honesty, professionalism, and ethical communication. You are responsible for reviewing and approving the sequences and tone configured in your account.
      </p>

      <h2>7. Fees & Payment</h2>
      <p>
        Service fees are charged according to your chosen pricing plan (Standard: $29/month flat fee or 0.5% of recovered revenue; Premium: $79/month). Fees are billed monthly. Both plans include a free trial period.
      </p>

      <h2>8. Intellectual Property</h2>
      <p>
        The Service, including its code, design, and AI models, is owned by Reclaim AI. You retain all rights to your business data, invoice information, and branded email templates.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        Reclaim AI is not liable for any indirect, incidental, or consequential damages arising from use of the Service. Our total liability is limited to the amount paid by you in the 12 months preceding the claim.
      </p>

      <h2>10. Termination</h2>
      <p>
        Either party may terminate this agreement at any time. Upon termination, your access to the Service will be revoked, and your data will be deleted within 30 days unless otherwise required by law.
      </p>

      <h2>11. Changes to Terms</h2>
      <p>
        We may modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.
      </p>

      <h2>12. Governing Law</h2>
      <p>
        These terms are governed by the laws of the State of Delaware, United States.
      </p>

      <p className="mt-8">
        For questions, contact <Link href="mailto:legal@reclaimai.app" className="text-indigo-600 hover:underline">legal@reclaimai.app</Link>.
      </p>
    </div>
  )
}