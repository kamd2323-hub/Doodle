import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy - Reclaim AI",
  description: "Privacy Policy for Reclaim AI's automated invoice recovery platform.",
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose prose-slate">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-slate-500">Last updated: June 27, 2026</p>

      <h2>1. Introduction</h2>
      <p>
        Reclaim AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our automated invoice recovery platform.
      </p>

      <h2>2. Information We Collect</h2>
      <h3>2.1 Account Information</h3>
      <p>
        When you create an account, we collect your name, email address, and business information.
      </p>
      <h3>2.2 Financial Data</h3>
      <p>
        When you connect Stripe or QuickBooks, we access invoice and payment data solely to automate dunning (payment reminder) communications. We never store full credit card numbers or bank account details.
      </p>
      <h3>2.3 Communication Data</h3>
      <p>
        We store email templates, dunning sequences, and communication logs necessary to provide our recovery service.
      </p>

      <h2>3. How We Use Your Information</h2>
      <ul>
        <li>To automate invoice recovery communications on your behalf</li>
        <li>To sync and analyze invoice status from connected financial platforms</li>
        <li>To improve and optimize our AI personalization engine</li>
        <li>To provide customer support and service notifications</li>
      </ul>

      <h2>4. Data Sharing & Disclosure</h2>
      <p>
        We do not sell your personal data. We share data only with:
      </p>
      <ul>
        <li><strong>Stripe / QuickBooks:</strong> To sync invoice data based on your explicit OAuth authorization</li>
        <li><strong>OpenAI (GPT-4o-mini):</strong> To personalize email content — we send invoice context (amount, due date, client name) to OpenAI; no sensitive financial identifiers are shared</li>
        <li><strong>Resend:</strong> To dispatch emails through their transactional email service</li>
      </ul>

      <h2>5. Data Retention</h2>
      <p>
        We retain your data for as long as your account is active. You may request deletion of your data at any time by contacting us. Connected platform access tokens can be revoked at any time.
      </p>

      <h2>6. Security</h2>
      <p>
        We implement industry-standard security measures including encryption at rest and in transit, OAuth token rotation, and regular security audits.
      </p>

      <h2>7. Your Rights</h2>
      <p>
        Depending on your jurisdiction, you may have rights to access, correct, delete, or port your data. Contact us at privacy@reclaimai.app to exercise these rights.
      </p>

      <h2>8. Third-Party Services</h2>
      <p>
        Reclaim AI integrates with Stripe, QuickBooks, OpenAI, and Resend. Each service has its own privacy policy governing how they handle data transmitted through our platform.
      </p>

      <h2>9. Updates to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes via email or through the platform.
      </p>

      <h2>10. Contact</h2>
      <p>
        For questions about this policy, contact us at privacy@reclaimai.app.
      </p>
    </div>
  )
}