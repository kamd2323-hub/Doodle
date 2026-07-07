# Enterprise Dashboard — Multi-Account View & Team Management UI

> **Phase 3: Scaling & Enterprise**  
> Design doc for the multi-account / multi-organization dashboard UI and team management pages.  
> Backend is already complete (schema, API routes, RLS, team lib) — this covers the frontend.

---

## 1. Overview & Design Principles

### Goal
Transform Reclaim AI from a single-user tool into a team-based platform where:
- **Admins** manage billing, integrations, team members, and white-labeling
- **Members** use the core recovery features (dashboard, campaigns, sequences)
- The UI stays clean and simple while revealing power-user features contextually

### Principles
1. **Role-aware UI** — Features, buttons, and pages appear/disappear based on `admin` vs `member` role
2. **Org scope by default** — All dashboard KPIs query by `organization_id`, not `profile_id`
3. **Progressive disclosure** — Team management is a settings sub-page, not a top-level nav item
4. **Plan-tier gates** — Premium features (white-labeling, 3+ seats) shown but locked for Standard plans
5. **Consistent design language** — Same shadcn/ui + Tailwind + Lucide icons as existing UI

---

## 2. Page Architecture

### Updated Route Structure
```
/(dashboard)/
  dashboard/          ← Org-level KPIs (updated queries, add team member count)
  invoices/           ← No UI change (org-scoped queries only)
  campaigns/          ← No UI change (org-scoped queries, show creator name)
  sequences/          ← No UI change (org-scoped queries)
  settings/           ← Existing page — REFACTOR into tabbed layout
    ├─ Integrations   ← Existing: Stripe/QBO connect (admin-only)
    ├─ Branding       ← Existing: profile/org branding
    ├─ Domain         ← Existing: email domain verification
    ├─ Team           ← NEW: member list, invite, role management
    └─ Organization   ← NEW: org name, plan tier, billing info
  team/               ← NEW PAGE: team listing (read-only for members)
  invite/             ← NEW PAGE: accept team invitation (?token=xxx)
```

### Navigation Changes (Sidebar)
Add new items to the sidebar navigation array:
```
Settings      → /settings             (existing, now tabbed)
Team          → /settings?tab=team    (or direct /team page)
```

The safest approach: **keep Settings as the hub** and add a `Team` sub-tab.  
Members see a read-only team view; admins see management controls.

---

## 3. Settings Page — Tabbed Layout Refactor

### Design

The existing Settings page (`/settings`) should be refactored from a flat scroll of cards into a **tabbed layout** with a left-side vertical tab bar (consistent with modern SaaS patterns).

```
┌─────────────────────────────────────────────────────┐
│ Settings & Integrations                              │
│ Manage your account, team, and organization settings │
├───────────┬─────────────────────────────────────────┤
│           │                                         │
│   ⚡      │  [Tab Content Area]                     │
│ Integrations│                                       │
│           │                                         │
│   🎨      │                                         │
│ Branding  │                                         │
│           │                                         │
│   🌐      │                                         │
│ Domain    │                                         │
│           │                                         │
│   👥      │                                         │
│ Team      │  ← NEW: Team Management Tab             │
│           │                                         │
│   🏢      │                                         │
│ Org       │  ← NEW: Organization Settings Tab        │
│           │                                         │
└───────────┴─────────────────────────────────────────┘
```

### Tab Definitions

| Tab ID | Label | Icon | Admin Only? | Description |
|--------|-------|------|-------------|-------------|
| `integrations` | Integrations | `PlugZap` | No (members see read-only status) | Stripe/QBO connection management |
| `branding` | Branding | `Palette` | No (members see read-only) | Logo, from-name, tone |
| `domain` | Domain | `Globe` | No (members see read-only) | Email domain verification |
| `team` | Team | `Users` | Members see read-only list | Member mgmt, invites, roles |
| `organization` | Organization | `Building2` | Yes | Org name, plan, billing, white-label |

### Implementation Plan

1. Create a new `SettingsLayout` component with a vertical tab bar
2. Create individual tab content components:
   - `IntegrationsTab` — extract from existing settings page
   - `BrandingTab` — extract from existing settings page
   - `DomainTab` — extract from existing settings page
   - `TeamTab` — NEW (see Section 4)
   - `OrganizationTab` — NEW (see Section 5)
3. Use URL search params for tab state: `/settings?tab=team`
4. Role-gate admin-only tabs: hide `Organization` tab for members; show read-only views for `Team`

---

## 4. Team Management Tab (Settings → Team)

### 4.1 Page Layout

Two sections stacked vertically:

#### Section A: Current Team Members

```
┌─────────────────────────────────────────────────────┐
│ Team Members                    [Plan: Premium]      │
│ 3 of 10 members used                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 👤 Alex Chen          alex@acmecorp.com  Admin │ │
│ │   Joined Jan 15, 2026        [Remove] [▼Member]│ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 👤 Jamie Smith       jamie@acmecorp.com  Member │ │
│ │   Joined Mar 3, 2026         [Remove] [▲Admin] │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📧 sarah@acmecorp.com              Invited   │   │
│ │   Invited Mar 10, 2026  [Resend] [Revoke]  │   │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [+ Invite Team Member]                              │
└─────────────────────────────────────────────────────┘
```

#### Section B: Invite Member Modal (Dialog)

```
┌───────────────────────────────────────┐
│ Invite Team Member                    │
│                                       │
│ Email address                         │
│ [____________________________]        │
│                                       │
│ Role                                  │
│ [▼ Admin ─────────────────────────]  │
│  Admin: Full access to all settings   │
│  Member: Operational access only      │
│                                       │
│ [Cancel]  [Send Invitation]           │
└───────────────────────────────────────┘
```

### 4.2 Component Tree

```
TeamTab (client component)
├── TeamHeader
│   ├── PlanBadge (shows "Standard" or "Premium")
│   ├── MemberCountBar ("3 of 10 members used")
│   └── InviteButton (admin only)
├── MembersList
│   ├── MemberRow (active members)
│   │   ├── Avatar (circle with initials)
│   │   ├── Name + Email
│   │   ├── RoleBadge ("Admin" / "Member")
│   │   ├── JoinedDate
│   │   └── ActionsDropdown (admin only)
│   │       ├── Promote to Admin / Demote to Member
│   │       ├── Remove from Team (with confirmation)
│   │       └── Suspend (future)
│   └── InvitationRow (pending invites)
│       ├── Email (with mail icon)
│       ├── StatusBadge ("Invited")
│       ├── InvitedDate
│       └── Actions (admin only)
│           ├── Resend Invitation
│           └── Revoke Invitation
└── InviteMemberDialog (dialog component)
    ├── EmailInput
    ├── RoleSelect (Admin/Member)
    └── SubmitButton
```

### 4.3 States

| State | Behaviour |
|-------|-----------|
| **Loading** | Skeleton cards (3 placeholder rows, pulsing) |
| **Empty** | "No team members yet. Invite your first teammate!" + prominent invite button |
| **Standard plan** | Show "Upgrade to Premium to add team members" banner above invite button |
| **At max capacity** | Show "You've reached your member limit" banner + "Upgrade Plan" CTA |
| **Error** | Inline error toast (consistent with existing notification pattern) |
| **Admin view** | Full management: invite, remove, change roles |
| **Member view** | Read-only list: can see teammates but no action buttons |

### 4.4 API Integration

| Action | Endpoint | Method |
|--------|----------|--------|
| List members | `/api/team/members` | `GET` |
| Invite member | `/api/team/members` | `POST` |
| Remove member | `/api/team/members/[id]` | `DELETE` |
| Change role | `/api/team/members/[id]` | `PATCH` |
| Resend invite | Re-use `POST /api/team/members` (same email → new token) | |
| Revoke invite | `DELETE /api/team/members/[invitationId]` (delete invitation row) | |

**Data model returned by `GET /api/team/members`:**
```typescript
{
  members: [
    {
      id: string,
      organization_id: string,
      profile_id: string,
      role: 'admin' | 'member',
      status: 'active' | 'invited',
      profile_name?: string,       // joined from profiles table
      profile_email?: string,      // joined from profiles table
      created_at: string,
      invited_by?: string,
    }
  ],
  organizationId: string,
  role: 'admin' | 'member',
  maxMembers: number,
  memberCount: number,
}
```

### 4.5 Invitation Flow

1. Admin clicks "Invite Team Member"
2. Dialog opens — enter email + select role
3. Submit → `POST /api/team/members` → creates invitation row + sends email
4. Success toast: "Invitation sent to hello@example.com"
5. List refreshes — shows pending invitation row
6. Recipient clicks invite link → `/invite?token=xxx` page
7. If not logged in → redirect to login, then back to `/invite?token=xxx`
8. Accept page shows org name, inviter name, "Accept Invitation" button
9. On accept → `POST /api/invitations/[token]/accept`
10. Redirect to dashboard with welcome toast: "Welcome to [Org Name]!"

### 4.6 Confirmation Dialogs

| Action | Dialog |
|--------|--------|
| Remove member | "Remove [Name] from your team? They will lose access to all organization data. This action cannot be undone." [Cancel] [Remove] |
| Change role | "Change [Name]'s role to Admin? Admins have full access to all settings, including billing and integrations." [Cancel] [Change Role] |
| Revoke invite | "Revoke invitation for [email]? They will no longer be able to join your organization via this link." [Cancel] [Revoke] |

---

## 5. Organization Settings Tab (Settings → Organization)

### 5.1 Page Layout

```
┌─────────────────────────────────────────────────────┐
│ Organization Settings              [Admin Only]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Organization Name                                   │
│ [Acme Corp Consulting_________________________]     │
│                                                     │
│ Billing Email                                       │
│ [billing@acmecorp.com_________________________]     │
│                                                     │
│ ─── White-Labeling (Premium Feature) ─────────────  │
│                                                     │
│ Custom Domain                                       │
│ [emails.acmecorp.com__________________________]     │
│                                                     │
│ Primary Color                                       │
│ [  #6366f1  ]  [■] Color picker preview             │
│                                                     │
│ Logo URL                                            │
│ [https://acmecorp.com/logo.png____________]         │
│                                                     │
│ From Name                                           │
│ [Acme Corp Finance___________________________]      │
│                                                     │
│ From Email                                          │
│ [finance@acmecorp.com________________________]      │
│                                                     │
│ ─── Plan & Billing ──────────────────────────────   │
│                                                     │
│ Current Plan: Premium ($79/mo)                      │
│ Next Billing Date: Apr 15, 2026                     │
│ Members: 3 of 10 used                               │
│                                                     │
│ [Manage Subscription →]                              │
│                                                     │
│ [Save Changes]                                       │
└─────────────────────────────────────────────────────┘
```

### 5.2 Component Tree

```
OrganizationTab (client component, admin-only)
├── OrgNameInput
├── BillingEmailInput
├── WhiteLabelingSection
│   ├── CustomDomainInput
│   ├── PrimaryColorInput (color + hex text input)
│   ├── LogoUrlInput
│   ├── FromNameInput
│   └── FromEmailInput
├── PlanBillingCard
│   ├── PlanName + Price
│   ├── MemberUsageBar
│   ├── NextBillingDate
│   └── ManageSubscriptionLink
└── SaveButton
```

### 5.3 API Integration

| Action | Endpoint | Method |
|--------|----------|--------|
| Get org settings | `/api/organization` | `GET` |
| Update org settings | `/api/organization` | `PUT` |

The GET endpoint returns:
```typescript
{
  organization: {
    id, name, slug, plan_tier, max_members,
    billing_email, custom_domain, logo_url,
    primary_color, from_name, from_email,
    created_at, updated_at
  },
  role: 'admin' | 'member',
  memberCount: number,
  maxMembers: number,
}
```

---

## 6. Invitation Accept Page

### 6.1 Route
`/invite` — query param `?token=xxx`

### 6.2 Page Layout (No Auth / Public)

```
┌───────────────────────────────────────────────┐
│                                               │
│               ✨ Reclaim AI                    │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │                                         │  │
│  │  You're invited!                        │  │
│  │                                         │  │
│  │  [Company Logo]                         │  │
│  │                                         │  │
│  │  **Acme Corp Consulting** has invited   │  │
│  │  you to join their team on Reclaim AI.  │  │
│  │                                         │  │
│  │  Role: **Admin**                        │  │
│  │                                         │  │
│  │  Invited by: Alex Chen                  │  │
│  │                                         │  │
│  │  [Accept Invitation]                    │  │
│  │                                         │  │
│  │  Don't have an account? [Sign Up]       │  │
│  │  Already have one? [Log In]             │  │
│  │                                         │  │
│  └─────────────────────────────────────────┘  │
│                                               │
└───────────────────────────────────────────────┘
```

### 6.3 States

| State | Behaviour |
|-------|-----------|
| **Loading** | Centered spinner |
| **Valid invitation** | Show org name, inviter, role, accept button |
| **Already accepted** | "This invitation has already been accepted" + "Go to Dashboard" link |
| **Expired** | "This invitation has expired" + "Ask your admin to send a new one" |
| **Not found** | "Invitation not found. The link may be invalid." |
| **Logged out / no account** | Show login/signup CTAs alongside the accept button |
| **Accepting** | Button shows loading spinner, disabled |
| **Accepted successfully** | Redirect to dashboard with toast: "Welcome to Acme Corp Consulting!" |

### 6.4 Component Tree

```
InvitePage (server component — fetches token from search params)
├── InviteCard (client component)
│   ├── OrgLogo (if available)
│   ├── OrgName
│   ├── InviterName
│   ├── RoleBadge
│   ├── AcceptButton
│   └── AuthLinks (Login / Sign Up)
└── ErrorState / ExpiredState / AcceptedState (conditional)
```

---

## 7. Dashboard — Org-Scoped Updates

### 7.1 Query Changes
The existing dashboard page (`/dashboard`) queries need to switch from `profile_id` to `organization_id`:

| Current Query | New Query |
|--------------|-----------|
| `.eq('profile_id', user.id)` | `.eq('organization_id', orgId)` |
| Fetches `oauth_connections` by profile | Fetches by org (shared connections) |

### 7.2 New Dashboard Elements

Add these to the dashboard header:
1. **Org name + plan badge** — e.g. "Acme Corp Consulting • Premium"
2. **Team member count** — e.g. "3 team members" (clickable → /settings?tab=team)
3. **"Only you can see this"** tooltip for role-sensitive data

```
┌──────────────────────────────────────────────────────┐
│ Dashboard                                    [Admin] │
│ Acme Corp Consulting • Premium • 3 team members     │
├──────────────────────────────────────────────────────┤
│                                                      │
│ [Total Outstanding] [Recovery Rate] [Total Recovered]│
│      $12,450.00        68.3%          $8,500.00      │
│                                                      │
│ [Recent Activity (all team members)]  [Upcoming ...] │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 7.3 Recent Activity — Enriched for Multi-User

Add the team member's name to recent email log entries:
```
Mail sent to client@example.com         Sent
Invoice INV-024 • by Alex Chen • Mar 10, 2:30 PM
```

This requires joining `dunning_email_logs` → `dunning_campaigns` → `organization_members` → `profiles` to resolve the sender's name.

---

## 8. New Components to Create

### 8.1 `/src/components/settings/SettingsTabs.tsx`
- Reusable vertical tab navigation component
- Props: `tabs: TabDef[]`, `activeTab: string`, `onTabChange`
- Each tab: icon + label + optional admin badge
- Styled with Tailwind (`bg-slate-50`, `rounded-lg`, hover states)

### 8.2 `/src/components/settings/TeamTab.tsx`
- Main team management component (see Section 4)
- Sub-components: `TeamHeader`, `MembersList`, `MemberRow`, `InvitationRow`, `InviteMemberDialog`

### 8.3 `/src/components/settings/OrganizationTab.tsx`
- Organization settings form (see Section 5)
- Sub-components: `WhiteLabelingForm`, `PlanBillingCard`

### 8.4 `/src/components/settings/InviteMemberDialog.tsx`
- Modal dialog (`@/components/ui/dialog` from shadcn)
- Email input with validation
- Role select
- Submit with loading state

### 8.5 `/src/components/settings/ConfirmActionDialog.tsx`
- Reusable confirmation dialog for destructive actions
- Props: `title`, `description`, `confirmLabel`, `onConfirm`, `onCancel`, `variant: 'danger' | 'warning'`

### 8.6 `/src/components/settings/MemberAvatar.tsx`
- Circle with initials, or optional profile image
- Size variants: `sm` (list), `lg` (dialog)

### 8.7 `/src/app/(dashboard)/invite/page.tsx`
- Invitation acceptance page (see Section 6)

---

## 9. Existing File Changes

### 9.1 `/src/components/layout/sidebar.tsx`
- Update navigation — no new top-level items needed (Team is a Settings sub-tab)
- Optionally add an org name/plan badge at the bottom of the sidebar

### 9.2 `/src/app/(dashboard)/settings/page.tsx`
- **Major refactor**: Extract existing cards into separate tab components
- Add tab navigation with URL-synced state (`/settings?tab=integrations`)
- Default tab: `integrations`
- Role-gate admin-only tabs

### 9.3 `/src/app/(dashboard)/dashboard/page.tsx`
- Switch all Supabase queries from `.eq('profile_id', user.id)` to `.eq('organization_id', orgId)`
- Resolve `orgId` from `getAuthContext()` or profile lookup
- Add org name, plan badge, and member count to header
- Enrich recent activity with team member names

### 9.4 `/src/app/(dashboard)/campaigns/page.tsx`
- Update queries to use `organization_id` (org-scoped campaigns)
- No major UI changes

### 9.5 `/src/app/(dashboard)/invoices/page.tsx`
- Update queries to use `organization_id`
- No major UI changes

### 9.6 `/src/app/(dashboard)/sequences/page.tsx`
- Update queries to use `organization_id`
- No major UI changes

---

## 10. State Management & Data Fetching Pattern

### Recommended Pattern: Server Components + Client Island

For the Settings tabs, use a hybrid approach:

1. **Server component** for initial data fetching (faster, no loading state on page load):
```tsx
// page.tsx
export default async function SettingsPage({ searchParams }) {
  const supabase = await createClient()
  const authContext = await getAuthContext()
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', authContext.organizationId)
    .single()
  
  return <SettingsShell org={org} role={authContext.role} />
}
```

2. **Client component** `SettingsShell` with:
   - Tab navigation state (synced to URL search params)
   - Mutations via plain `fetch()` (no TanStack Query needed for this scale)
   - Local state for forms, loading on mutations

### Mutation Pattern (Consistent with Existing)

```typescript
// Used across all team management actions
const handleInvite = async (email: string, role: string) => {
  setSubmitting(true)
  setError(null)
  try {
    const res = await fetch('/api/team/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    setShowDialog(false)
    showSuccessToast(`Invitation sent to ${email}`)
    await refreshMembers()
  } catch (err: any) {
    setError(err.message)
  } finally {
    setSubmitting(false)
  }
}
```

---

## 11. Role-Based UI Guards

### Client-Side Pattern
```tsx
// Use a simple hook or pass role from server
const { role } = useAuthContext()

{role === 'admin' && (
  <Button onClick={handleInvite}>Invite Team Member</Button>
)}
```

### Server-Side Pattern (in API routes)
```typescript
const { role } = await getAuthContext()
const { allowed, response } = requireAdmin(role)
if (!allowed) return response
```

### Displaying Role Limits
```tsx
// For Standard plan users viewing Team tab
{planTier === 'standard' && (
  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
    <Rocket className="h-5 w-5 text-amber-600" />
    <p className="text-sm text-amber-800">
      <strong>Standard Plan</strong> — Your plan includes 1 seat.
      Upgrade to <strong>Premium ($79/mo)</strong> for up to 10 team members,
      white-labeling, and priority support.
    </p>
    <Button variant="outline" className="mt-2">Upgrade to Premium</Button>
  </div>
)}
```

---

## 12. Mobile Responsiveness

The tabbed Settings layout must work on mobile:

```
Mobile (<768px):
┌─────────────────────┐
│ Settings & Integrate│
├─────────────────────┤
│ [▼ Integrations]   │  ← Horizontal tab dropdown/select
│                     │
│ [Tab Content]       │
└─────────────────────┘

Desktop (≥768px):
┌──────────────────────────────────┐
│ Settings & Integrations          │
├────────┬─────────────────────────┤
│ ⚡Inte │ [Tab Content]          │
│ 🎨Bran │                        │
│ 🌐Doma │                        │
│ 👥Team │                        │
│ 🏢Org  │                        │
└────────┴─────────────────────────┘
```

Implementation: Use Tailwind's responsive utilities. Show vertical tabs on `md:` and above; show a `<select>` dropdown on mobile.

---

## 13. Implementation Order (Recommended)

| Step | Description | Dependencies | Effort |
|------|-------------|-------------|--------|
| 1 | Update dashboard queries to use `organization_id` + `getAuthContext()` | None | Small |
| 2 | Create `SettingsTabs` component + refactor settings page into tabs | Step 1 | Medium |
| 3 | Extract existing settings cards into tab components | Step 2 | Medium |
| 4 | Build `TeamTab` with read-only member list (member view) | Step 3 | Medium |
| 5 | Build `InviteMemberDialog` + admin actions (remove, change role) | Step 4 | Medium |
| 6 | Build `OrganizationTab` (org settings, plan info, white-labeling) | Step 3 | Medium |
| 7 | Build `/invite` accept page | Step 1 | Small |
| 8 | Add role-based UI guards across all pages | Steps 1-7 | Small |
| 9 | Mobile responsive polish | Steps 4-8 | Small |
| 10 | Test full invite → accept → dashboard flow | All | Small |

---

## 14. Future Considerations (Post-Phase 3)

- **Org Switcher** — For users belonging to multiple organizations (future feature)
- **Audit logs** — Track admin actions (invites, role changes, removals)
- **SSO/SAML** — Enterprise single sign-on
- **Read-only role** — Third role tier for external accountants/viewers
- **Billing portal** — Self-serve plan upgrades via Stripe Customer Portal
- **Webhook notifications** — Slack/email alerts when team members join/leave
- **Member activity dashboard** — See which team members are doing what

---

## 15. Appendix: Mock Data Shape for Testing

```typescript
// For testing the Team UI without live Supabase data
const mockTeamData = {
  members: [
    {
      id: 'mem-1',
      profile_id: 'user-1',
      profile_name: 'Alex Chen',
      profile_email: 'alex@acmecorp.com',
      role: 'admin',
      status: 'active',
      created_at: '2026-01-15T10:00:00Z',
    },
    {
      id: 'mem-2',
      profile_id: 'user-2',
      profile_name: 'Jamie Smith',
      profile_email: 'jamie@acmecorp.com',
      role: 'member',
      status: 'active',
      created_at: '2026-03-03T14:30:00Z',
    },
  ],
  invitations: [
    {
      id: 'inv-1',
      email: 'sarah@acmecorp.com',
      role: 'member',
      created_at: '2026-03-10T09:00:00Z',
      expires_at: '2026-03-17T09:00:00Z',
    },
  ],
  organization: {
    id: 'org-1',
    name: 'Acme Corp Consulting',
    plan_tier: 'premium',
    max_members: 10,
    memberCount: 2,
  },
  role: 'admin',
}
```

---

*Last updated: 2026-06-29 — Enterprise Dashboard UI Design v1.0*