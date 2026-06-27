# Domain Verification Guide for Reclaim AI

This guide explains how to configure your custom domain with **Resend** so that your dunning (payment recovery) emails are sent from **your own domain** instead of `onboarding@resend.dev`. Verified domains dramatically improve email deliverability, prevent messages from landing in spam, and build trust with your clients.

---

## Why Verify Your Domain?

| Without Verification | With Verified Domain |
|---|---|
| Sent from `onboarding@resend.dev` | Sent from `you@yourdomain.com` |
| Limited to sending to your own email (trial mode) | Send to any recipient |
| Higher spam classification risk | SPF/DKIM authenticated → lands in inbox |
| Lower client trust (unfamiliar sender) | Professional branding |

---

## Prerequisites

- A **custom domain** (e.g., `yourcompany.com`) that you control DNS for
- Access to your **DNS provider** (Cloudflare, Namecheap, GoDaddy, Route53, etc.)
- A **Resend account** with an active API key (already configured for Reclaim AI)

---

## Step 1: Add Your Domain in Resend

1. Log into [Resend Dashboard](https://resend.com)
2. Go to **Domains** → **Add Domain**
3. Enter your domain (e.g., `yourcompany.com`)
4. Click **Add**

Resend will display **two DNS records** that you need to create:

- **DKIM Record** (TXT)
- **SPF Record** (TXT) — optional but strongly recommended
- **DMARC Record** (TXT) — optional but strongly recommended

---

## Step 2: Configure DNS Records

### DKIM Record (Required)

DKIM (DomainKeys Identified Mail) adds a digital signature to your emails so receiving servers can verify they were legitimately sent.

| Record Type | Name/Host | Value |
|---|---|---|
| `TXT` | `resend._domainkey.yourcompany.com` | `"dkim.resend.com"` (example — **use value from Resend dashboard**) |

> ⚠️ **Important**: Resend generates a unique DKIM value for each domain. Copy the exact value from your Resend domain settings page.

### SPF Record (Required for Best Deliverability)

SPF (Sender Policy Framework) tells receiving mail servers which IPs are authorized to send email for your domain.

| Record Type | Name/Host | Value |
|---|---|---|
| `TXT` | `@` (or `yourcompany.com`) | `"v=spf1 include:spf.resend.com ~all"` |

If you already have an SPF record (e.g., from Google Workspace), **merge** this into the existing record:

```
v=spf1 include:_spf.google.com include:spf.resend.com ~all
```

> ⚠️ **Warning**: You can only have **one** SPF record per domain. If you already have one, add `include:spf.resend.com` to it instead of creating a separate record.

### DMARC Record (Recommended)

DMARC (Domain-based Message Authentication, Reporting & Conformance) tells receiving servers what to do if SPF or DKIM checks fail.

| Record Type | Name/Host | Value |
|---|---|---|
| `TXT` | `_dmarc.yourcompany.com` | `"v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourcompany.com; sp=quarantine; adkim=s; aspf=s"` |

Breakdown of the DMARC policy:
- `p=quarantine` — Send failing emails to spam instead of blocking them
- `rua=mailto:...` — Receive aggregate DMARC reports (optional)
- `adkim=s` — Strict DKIM alignment
- `aspf=s` — Strict SPF alignment

For a more relaxed policy during testing: `"v=DMARC1; p=none;"`

---

## Step 3: Update Reclaim AI Configuration

Once DNS propagation completes (typically 5–30 minutes, up to 48 hours), return to your Resend dashboard and click **Verify**.

Then update Reclaim AI's environment configuration with your verified sender email:

```
FROM_EMAIL_ADDRESS=billing@yourcompany.com
```

> You can also set a friendly "From Name" in the Reclaim AI dashboard under **Settings → Branding**.

---

## Step 4: Verify Propagation

After adding the DNS records, verify they've propagated:

**Using `dig` (command line):**
```bash
dig TXT resend._domainkey.yourcompany.com +short
dig TXT yourcompany.com +short
dig TXT _dmarc.yourcompany.com +short
```

**Using online tools:**
- [MXToolbox DKIM Lookup](https://mxtoolbox.com/DKIM.aspx)
- [MXToolbox SPF Lookup](https://mxtoolbox.com/SPF.aspx)

---

## Common DNS Providers Quick Reference

### Cloudflare
1. Go to DNS → Add Record
2. **DKIM**: Type `TXT`, Name `resend._domainkey`, Value from Resend (disable proxy)
3. **SPF**: Type `TXT`, Name `@`, Value `v=spf1 include:spf.resend.com ~all`
4. Ensure **Proxy Status** is set to **DNS Only** (grey cloud) for both records

### Namecheap
1. Go to Domain List → Manage → Advanced DNS
2. **DKIM**: Type `TXTXT`, Host `resend._domainkey`, Value from Resend
3. **SPF**: Type `TXTXT`, Host `@`, Value `v=spf1 include:spf.resend.com ~all`

### AWS Route53
1. Go to Hosted Zones → your domain → Create Record
2. **DKIM**: Record Type `TXT`, Name `resend._domainkey`, Value from Resend
3. **SPF**: Record Type `TXT`, Name `@`, Value `v=spf1 include:spf.resend.com ~all`

### GoDaddy
1. Go to My Domain → DNS Management
2. **DKIM**: Type `TXT`, Host `resend._domainkey`, Value from Resend
3. **SPF**: Type `TXT`, Host `@`, Value `v=spf1 include:spf.resend.com ~all`

---

## Troubleshooting

### "Domain is not verified" in Resend
- Wait for DNS propagation (up to 48 hours)
- Double-check the exact TXT value from Resend
- Ensure no extra whitespace or quotes in the DNS record value

### Emails still going to spam after verification
- Verify SPF record is correctly configured: `dig TXT yourdomain.com`
- Verify DKIM record is correctly configured: `dig TXT resend._domainkey.yourdomain.com`
- Add a DMARC policy
- Check your domain's sending reputation

### Multiple SPF records detected
- You can only have one SPF record. Merge all `include:` mechanisms into a single record
- Use a tool like [SPF Merge Wizard](https://www.mxtoolbox.com/spfmergewizard.aspx)

### "From address not yet verified" in Resend
- Only `onboarding@resend.dev` is pre-verified
- Any custom domain sender must complete the DNS verification above
- Trial API keys (from the onboarding flow) can **only** send to the account owner's email address
- To send to any recipient, upgrade to a production Resend API key with a verified domain

---

## Testing Your Configuration

After domain verification is complete, you can test your email deliverability by sending a test from the Resend dashboard or using the Reclaim AI test email utility.

Reclaim AI will automatically use your verified domain for all dunning campaign emails once you:
1. Verify the domain in Resend
2. Add `FROM_EMAIL_ADDRESS` to your environment
3. Configure your sending name in Settings → Branding

---

## Security Notes

- **Never share** your Resend API key
- **Never commit** `.env.local` or API keys to version control
- Rotate API keys periodically via the Resend dashboard
- Use the principle of least privilege — Resend API keys only need the `email:send` permission
- Keep DMARC reports enabled to monitor for spoofing attempts

---

*Last updated: June 2026 | Reclaim AI — Automated Invoice Recovery*