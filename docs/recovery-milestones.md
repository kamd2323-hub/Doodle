# Recovery Milestones

Reclaim AI automatically tracks recovery milestones and notifies the account owner when key revenue recovery thresholds are reached.

---

## How Milestones Work

Each time a payment is recovered (via webhook or auto-resolve), the system checks the **total cumulative amount recovered** across all dunning campaigns. If the total crosses a milestone threshold for the first time, an email notification is sent to the account owner.

### Milestone Thresholds

| Milestone | Amount | Notification |
|---|---|---|
| 🥉 $100 Recovered | $100.00 | Email sent when first $100 is recovered |
| 🥈 $500 Recovered | $500.00 | Email sent when total crosses $500 |
| 🥇 $1,000 Recovered | $1,000.00 | Email sent when total crosses $1,000 |

### Calculation Method

- **Data Source**: The `recoveries` table in Supabase
- **Aggregation**: `SUM(amount_recovered_cents)` across all profiles
- **Trigger Points**: Each milestone is a **one-time event** — it fires only the first time the total crosses the threshold
- **De-duplication**: Once a milestone is recorded in the `recovery_milestones` table, it will never fire again, even if the total drops and recovers

---

## How It's Integrated

### Automatic Triggers

The milestone check runs automatically in these scenarios:

1. **Stripe Webhook** (`POST /api/webhooks/stripe`) — When an `invoice.paid` event is received and recovery is recorded
2. **QBO Webhook** (`POST /api/webhooks/qbo`) — When an Invoice change event triggers sync and auto-resolve
3. **Auto-Resolve** (during dunning processor runs) — When `autoResolvePaidCampaigns()` detects paid invoices and logs recoveries
4. **Manual Check** (`POST /api/milestones`) — Can be called explicitly to trigger a milestone check

### Manual API Endpoint

```http
GET /api/milestones
```

Returns current recovery totals and milestone status:

```json
{
  "total_recovered_cents": 52345,
  "total_recovered_formatted": "$523.45",
  "milestones": [
    {
      "id": "...",
      "milestone_key": "milestone_100",
      "milestone_label": "$100",
      "total_recovered_cents_at_milestone": 10250,
      "email_sent": true,
      "notified_at": "2026-06-27T12:00:00Z"
    }
  ],
  "next_milestone": {
    "label": "$1,000",
    "cents": 100000,
    "remaining_cents": 47655
  }
}
```

### Trigger Check Explicitly

```http
POST /api/milestones
```

Triggers an immediate milestone check and returns results.

---

## Database Schema

The `recovery_milestones` table stores all milestone events:

```sql
CREATE TABLE public.recovery_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_key VARCHAR(50) UNIQUE NOT NULL,
    milestone_label VARCHAR(50) NOT NULL,
    threshold_cents BIGINT NOT NULL,
    total_recovered_cents_at_milestone BIGINT NOT NULL,
    email_sent BOOLEAN DEFAULT true NOT NULL,
    notified_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

Each row records:
- **milestone_key**: Unique identifier (`milestone_100`, `milestone_500`, `milestone_1000`)
- **milestone_label**: Human-readable label (`$100`, `$500`, `$1,000`)
- **threshold_cents**: The threshold value in cents (10000, 50000, 100000)
- **total_recovered_cents_at_milestone**: The exact total recovered when the milestone was hit
- **email_sent**: Whether the notification email was successfully dispatched

---

## Owner Notification Emails

When a milestone is reached, an email is sent to `kamd2323@gmail.com` with:

- **Subject**: `🎉 Reclaim AI Milestone: $X Recovered!`
- **Content**: Milestone badge, total recovered amount, a summary of the achievement, and a note about the next milestone

Emails are sent via **Resend** using the same API key configured for dunning emails.

---

## Dashboard KPI Integration

The **Total Recovered** KPI displayed on the dashboard pulls from the same `recoveries` table, ensuring consistency between the real-time dashboard and milestone calculations.

```
SELECT SUM(amount_recovered_cents) FROM public.recoveries
```

This provides an accurate, real-time view of total recovered revenue alongside milestone progress tracking.

---

## Extending Milestones

To add new milestone thresholds:

1. Add the threshold to the `MILESTONES` array in `src/lib/milestones/index.ts`
2. Add the milestone_key to the GET endpoint response in `src/app/api/milestones/route.ts`
3. The system will automatically handle detection and notification for new milestones

Example for adding a $5,000 milestone:

```typescript
// In src/lib/milestones/index.ts
const MILESTONES = [
  { cents: 10000, label: '$100', key: 'milestone_100' },
  { cents: 50000, label: '$500', key: 'milestone_500' },
  { cents: 100000, label: '$1,000', key: 'milestone_1000' },
  { cents: 500000, label: '$5,000', key: 'milestone_5000' },  // New
];

// In src/app/api/milestones/route.ts (getNextMilestone function)
const milestones = [
  { label: '$100', cents: 10000 },
  { label: '$500', cents: 50000 },
  { label: '$1,000', cents: 100000 },
  { label: '$5,000', cents: 500000 },  // New
];
```

---

*Last updated: June 27, 2026 | Reclaim AI — Automated Invoice Recovery*