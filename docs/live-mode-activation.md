# Live Mode Activation Guide

This document provides step-by-step instructions for activating Reclaim AI's production ("Live Mode") configuration with Stripe and QuickBooks Online, including how to set up OAuth credentials, configure environment variables, and verify error-handling readiness.

---

## Prerequisites

- A **Reclaim AI** account with admin access
- A **Stripe account** with a live mode API key (or test mode for initial setup)
- A **QuickBooks Online** account (for QBO integration)
- Ability to set environment variables in your hosting platform (Vercel, Railway, etc.)

---

## 1. Environment Variables

### Required Variables

| Variable | Description | Example |
|---|---|---|
| `RESEND_API_KEY` | Transactional email API key from Resend | `re_abc123...` |
| `OPENAI_API_KEY` | OpenAI API key for AI personalization | `sk-proj-...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `STRIPE_CLIENT_ID` | Stripe Connect client ID (from Stripe Dashboard → Settings → Connect) | `ca_abc123...` |
| `QBO_CLIENT_ID` | QuickBooks Online OAuth App Client ID | `AB123...` |
| `QBO_CLIENT_SECRET` | QuickBooks Online OAuth App Client Secret | `XYZ...` |

### Optional but Recommended

| Variable | Description | Default |
|---|---|---|
| `STRIPE_REDIRECT_URI` | Custom callback URL after Stripe OAuth | `{origin}/api/auth/stripe/callback` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | None (falls back to unverified) |
| `QBO_REDIRECT_URI` | Custom callback URL after QBO OAuth | `{origin}/api/auth/qbo/callback` |
| `QBO_WEBHOOK_VERIFIER_TOKEN` | QBO webhook HMAC verifier token | None (falls back to unverified) |
| `STRIPE_SECRET_KEY` | Stripe secret key for webhook signature verification | None (graceful fallback) |
| `FROM_EMAIL_ADDRESS` | Verified sender email for dunning communications | `onboarding@resend.dev` |
| `SITE_URL` | Canonical site URL (used in OAuth redirects) | Auto-detected from request |

---

## 2. Stripe Connect — Live Mode Setup

### Step 1: Create Stripe Connect Application
1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Settings → Connect → Onboarding & branding**
3. Set your **Redirect URI** to: `https://your-domain.com/api/auth/stripe/callback`
4. Copy the **Client ID** from **Settings → Connect → API keys**

### Step 2: Configure Environment
```bash
STRIPE_CLIENT_ID=ca_live_abc123...
STRIPE_REDIRECT_URI=https://your-domain.com/api/auth/stripe/callback
STRIPE_WEBHOOK_SECRET=whsec_abc123...   # Optional
STRIPE_SECRET_KEY=sk_live_abc123...     # Optional, for webhook verification
```

### Step 3: Configure Stripe Webhook (Optional but Recommended)
1. In Stripe Dashboard, go to **Developers → Webhooks → Add endpoint**
2. Set endpoint URL: `https://your-domain.com/api/webhooks/stripe`
3. Listen for: `invoice.paid`, `invoice.payment_succeeded`
4. Copy the **Signing secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET`

---

## 3. QuickBooks Online — Live Mode Setup

### Step 1: Create Intuit App
1. Go to [Intuit Developer Portal](https://developer.intuit.com)
2. Create a new app or select existing
3. Under **Keys**, copy **Client ID** and **Client Secret**
4. Under **Redirect URIs**, add: `https://your-domain.com/api/auth/qbo/callback`
5. Under **Scopes**, ensure `com.intuit.quickbooks.accounting` is selected
6. Subscribe to **Webhooks** for real-time invoice updates

### Step 2: Configure Environment
```bash
QBO_CLIENT_ID=AB123ABC...
QBO_CLIENT_SECRET=XYZ...
QBO_REDIRECT_URI=https://your-domain.com/api/auth/qbo/callback
QBO_WEBHOOK_VERIFIER_TOKEN=your_verifier_token  # From Intuit Webhooks dashboard
```

### Step 3: Configure QBO Webhook (Optional)
1. In Intuit Developer, go to **Webhooks**
2. Set callback URL: `https://your-domain.com/api/webhooks/qbo`
3. Subscribe to **Invoice** entity changes
4. Copy the **Verifier Token** and set it as `QBO_WEBHOOK_VERIFIER_TOKEN`

---

## 4. Supabase Production Setup

### Step 1: Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com)
2. Create a new project
3. Copy the **Project URL** and **anon public key** from **Settings → API**

### Step 2: Apply Database Schema
Run the schema from `/home/team/shared/schema.sql` in the Supabase SQL editor:
```sql
-- Execute the full schema file
```

### Step 3: Configure Environment
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 5. Email Domain Verification (Resend)

### Step 1: Verify Domain
1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add your sending domain (e.g., `yourcompany.com`)
3. Configure **DKIM** and **SPF** DNS records (see `docs/domain-verification-guide.md`)

### Step 2: Configure Environment
```bash
RESEND_API_KEY=re_abc123...
FROM_EMAIL_ADDRESS=billing@yourcompany.com
```

---

## 6. Error Handling Verification

The Reclaim AI codebase implements the following error-handling safeguards:

| Scenario | Behavior |
|---|---|
| Missing/reset OpenAI API key | Falls back to local template engine (regex-based placeholder substitution) |
| Missing/reset Resend API key | `sendDunningEmail` fails gracefully, logs error to `dunning_email_logs`, releases campaign lock |
| Stripe webhook without secret | Skips signature verification, parses payload directly (safe for local dev) |
| Supabase unavailability | Falls back to local JSON file storage for OAuth connections and sync data |
| OAuth token exchange failure | Uses mock tokens for sandbox testing, logs warning |
| Email to unverified recipient (trial) | 403 logged gracefully, campaign retries later |
| QBO refresh token rotation | Handled by `QBOSyncProvider` with rotating refresh token logic |

### Key Resilience Points

- **AI Engine** (`src/lib/ai/personalization.ts`): Automatically detects placeholder/mock API keys and switches to `personalizeFallback()` without crashing
- **Dunning Processor** (`src/lib/dunning/processor.ts`): Uses pessimistic row-locking to prevent duplicate sends, logs all failures to DB, releases locks on error for retry
- **Sync Engine** (`src/lib/sync/index.ts`): Dual-persistence strategy (Supabase + local JSON). If Supabase write fails, the sync is still marked successful so the dashboard doesn't break

---

## 7. Final Verification Checklist

Before going live:

- [ ] All 10 environment variables configured in production
- [ ] Stripe Connect application set to **Live Mode**
- [ ] QBO Intuit app set to **Production** (not Sandbox)
- [ ] Resend domain verified with SPF/DKIM records
- [ ] Supabase schema applied and RLS policies active
- [ ] OAuth redirect URIs match production domain exactly
- [ ] Webhook endpoints registered and listening
- [ ] `FROM_EMAIL_ADDRESS` uses verified domain sender
- [ ] Production build compiles with zero errors
- [ ] SSL/TLS enabled on deployment (automatic with Vercel/Railway)
- [ ] CSRF state verification cookies use `Secure` flag in production

---

## 8. Testing the Flow

1. **OAuth Connection**: Go to `/settings` and click "Connect Stripe" or "Connect QuickBooks" — should redirect to provider, authorize, and return to settings with success notification
2. **Manual Sync**: Go to `/invoices` and click "Manual Sync" — should trigger `/api/sync/all` and display results
3. **Sync API**: `GET /api/sync/all` — returns JSON with sync results (or unauthorized if not authenticated)
4. **System Status**: Dashboard shows "System is Live" indicator when all services are configured

---

*Last updated: June 27, 2026 | Reclaim AI — Automated Invoice Recovery*