'use client'

import Script from 'next/script'

/**
 * Rewardful affiliate tracking script.
 * Loads the Rewardful.js snippet globally and sets up cookie tracking
 * for affiliate referrals on Stripe Checkout conversions.
 *
 * Rewardful uses a first-party cookie (_rewardful_id) set when a visitor
 * clicks an affiliate link. The Stripe Checkout Session API reads this
 * cookie and passes it as metadata for automatic commission tracking.
 */
export function RewardfulScript() {
  const apiKey = process.env.NEXT_PUBLIC_REWARDFUL_API_KEY

  if (!apiKey || apiKey === 'your-rewardful-api-key') {
    // Rewardful not configured — silently skip in dev/mock mode
    return null
  }

  return (
    <Script
      id="rewardful-script"
      src="https://r.wdfl.co/rw.js"
      data-rewardful={apiKey}
      strategy="afterInteractive"
      async
    />
  )
}
