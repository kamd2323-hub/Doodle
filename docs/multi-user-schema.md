# Multi-User / Team Access — Schema Design & Migration Plan

> **Phase 3: Scaling**  
> This document defines the database schema changes, Row-Level Security (RLS) policies, and migration strategy required to support multiple users per organization with team-based access on Reclaim AI.

---

## 1. Overview

### Current State (Phase 1–2)
- **1 user = 1 profile** (1:1 with `auth.users`)
- Every business table uses `profile_id` as the owner key
- RLS is strictly single-user: `auth.uid() = profile_id`
- No concept of teams, sharing, or cross-user access

### Target State (Phase 3)
- **Organizations** as the top-level tenant
- **Users** belong to organizations via membership table
- **Business data** (invoices, clients, sequences, campaigns) is owned by the organization, not an individual user
- **Roles**: `admin` (full control) and `member` (operational access)
- **Tier gating**: Premium tier unlocks 3+ seats; Standard tier = single user + owner-only
- **White-labeling**: Premium organizations can set custom domain, logo, from-name

### Design Principles
- **Backward compatibility**: Existing single-user profiles seamlessly become single-owner orgs
- **Minimal migration risk**: Additive schema changes; no data deletion
- **Incremental rollout**: Backend schema + API first; frontend team access later
- **Security**: RLS enforced at row level for every query

---

## 2. New Tables

### 2.1 `organizations` — Top-Level Tenant

```sql
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,         -- URL-friendly identifier

    -- Billing & Plan
    plan_tier VARCHAR(50) DEFAULT 'standard' NOT NULL  -- 'standard', 'premium'
        CHECK (plan_tier IN ('standard', 'premium')),
    max_members INTEGER DEFAULT 1 NOT NULL,    -- 1 for standard, 10+ for premium
    billing_email VARCHAR(255),

    -- White-Labeling (Premium feature)
    custom_domain VARCHAR(255),                -- Verified custom email domain
    logo_url TEXT,
    primary_color VARCHAR(7),                  -- Hex color e.g. #6366f1
    from_name VARCHAR(255),                    -- Default sender name for dunning emails
    from_email VARCHAR(255),                   -- Verified sender email

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

**Key decisions:**
- `slug` is unique — used for vanity URLs and team identification
- `max_members` enforces plan limits at the DB level (checked on INSERT into `organization_members`)
- White-labeling fields (`custom_domain`, `logo_url`, `primary_color`, `from_name`, `from_email`) live on the organization, not individual profiles — consistent branding across the team

### 2.2 `organization_members` — User ↔ Organization Join Table

```sql
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    role VARCHAR(50) NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member')),

    -- Invite tracking
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active' NOT NULL
        CHECK (status IN ('active', 'invited', 'suspended')),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    UNIQUE (organization_id, profile_id)
);
```

**Key decisions:**
- `UNIQUE(organization_id, profile_id)` prevents duplicate memberships
- `invited_by` / `invited_at` / `accepted_at` support the invite flow (invite email → accept → active)
- `status` allows suspending members without deleting their data associations
- `role` currently has two tiers (`admin`, `member`) — extensible for future roles (e.g. `billing`, `readonly`)

### 2.3 `team_invitations` — Pending Invites (Optional but Recommended)

```sql
CREATE TABLE public.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,               -- Email of invited person
    role VARCHAR(50) NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member')),
    token VARCHAR(255) UNIQUE NOT NULL,        -- Unique invite link token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    UNIQUE (organization_id, email)            -- One pending invite per org per email
);
```

---

## 3. Schema Changes to Existing Tables

### 3.1 `profiles` — Add Organization Link

```sql
ALTER TABLE public.profiles
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    ADD COLUMN onboarded_at TIMESTAMP WITH TIME ZONE;
```

**Why `SET NULL`**: If an org is deleted, the profile survives as an unaffiliated user (edge case, but safe).

**Migration**: Every existing profile gets:
1. A new `organizations` row created with their `business_name` as org name
2. Their `profile.organization_id` set to that org
3. An `organization_members` row with `role = 'admin'`

### 3.2 Business Tables — Add `organization_id`

Every table that currently uses `profile_id` for data ownership needs `organization_id`:

```sql
-- Ordered by dependency (leaf tables first to avoid FK issues)
ALTER TABLE public.oauth_connections    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.clients              ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.invoices             ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.sequences            ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.sequence_steps       ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.dunning_campaigns    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.dunning_email_logs   ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.recoveries           ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.recovery_milestones  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
```

**Migration**: For each row, set `organization_id = (SELECT organization_id FROM profiles WHERE id = profile_id)`.

**NOT NULL constraint**: Applied *after* the migration backfill completes:
```sql
ALTER TABLE public.clients ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN organization_id SET NOT NULL;
-- ... etc. for all business tables
```

### 3.3 Indexes on New Columns

```sql
CREATE INDEX idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX idx_org_members_profile ON public.organization_members(profile_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_invitations_org ON public.team_invitations(organization_id);
CREATE INDEX idx_org_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_oauth_org ON public.oauth_connections(organization_id);
CREATE INDEX idx_clients_org ON public.clients(organization_id);
CREATE INDEX idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX idx_sequences_org ON public.sequences(organization_id);
CREATE INDEX idx_campaigns_org ON public.dunning_campaigns(organization_id);
CREATE INDEX idx_email_logs_org ON public.dunning_email_logs(organization_id);
CREATE INDEX idx_recoveries_org ON public.recoveries(organization_id);
```

---

## 4. Row-Level Security (RLS) — Updated Policies

The core RLS shift: instead of `auth.uid() = profile_id`, we check whether the requesting user is an active member of the row's `organization_id`.

### 4.1 Helper Function (DRY)

```sql
-- Returns true if the requesting user is an active member of the given organization
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID, min_role VARCHAR DEFAULT 'member')
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_members om
        JOIN public.profiles p ON p.id = om.profile_id
        WHERE p.id = auth.uid()
          AND om.organization_id = org_id
          AND om.status = 'active'
          AND (
              min_role = 'member'
              OR (min_role = 'admin' AND om.role = 'admin')
          )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 Organization-Level Policies

```sql
-- Admins can view/update their org; members can view
CREATE POLICY "Admins can manage their organization"
    ON public.organizations FOR ALL
    USING (public.is_org_member(id, 'admin'))
    WITH CHECK (public.is_org_member(id, 'admin'));

CREATE POLICY "Members can view their organization"
    ON public.organizations FOR SELECT
    USING (public.is_org_member(id, 'member'));
```

### 4.3 Organization Members Policies

```sql
-- Admins can manage all members; members can see other members
CREATE POLICY "Admins can manage organization members"
    ON public.organization_members FOR ALL
    USING (public.is_org_member(organization_id, 'admin'));

CREATE POLICY "Members can view organization members"
    ON public.organization_members FOR SELECT
    USING (public.is_org_member(organization_id, 'member'));

-- Users can always see their own membership
CREATE POLICY "Users can view their own membership"
    ON public.organization_members FOR SELECT
    USING (profile_id = auth.uid());
```

### 4.4 Business Table Policies (Invoices, Clients, etc.)

Pattern for every business table:

```sql
-- Admins: full CRUD
CREATE POLICY "Admins can manage invoices"
    ON public.invoices FOR ALL
    USING (public.is_org_member(organization_id, 'admin'))
    WITH CHECK (public.is_org_member(organization_id, 'admin'));

-- Members: read + insert only (no delete)
CREATE POLICY "Members can view invoices"
    ON public.invoices FOR SELECT
    USING (public.is_org_member(organization_id, 'member'));

CREATE POLICY "Members can create invoices"
    ON public.invoices FOR INSERT
    WITH CHECK (public.is_org_member(organization_id, 'member'));

CREATE POLICY "Members can update invoices"    -- e.g., mark as paid
    ON public.invoices FOR UPDATE
    USING (public.is_org_member(organization_id, 'member'))
    WITH CHECK (public.is_org_member(organization_id, 'member'));
```

**For sensitive tables** (e.g. `oauth_connections` containing tokens):
- Only admins can read/write
- Members get no access

```sql
-- OAuth: admins only
CREATE POLICY "Admins can manage OAuth connections"
    ON public.oauth_connections FOR ALL
    USING (public.is_org_member(organization_id, 'admin'))
    WITH CHECK (public.is_org_member(organization_id, 'admin'));
```

### 4.5 Dunning Campaigns & Email Logs (Audit Visibility)

Members can view campaigns and logs for their organization (read-only for logs):

```sql
CREATE POLICY "Members can view campaigns"
    ON public.dunning_campaigns FOR SELECT
    USING (public.is_org_member(organization_id, 'member'));

CREATE POLICY "Admins can manage campaigns"
    ON public.dunning_campaigns FOR ALL
    USING (public.is_org_member(organization_id, 'admin'));

CREATE POLICY "Members can view email logs"
    ON public.dunning_email_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.dunning_campaigns dc
            WHERE dc.id = dunning_email_logs.campaign_id
              AND public.is_org_member(dc.organization_id, 'member')
        )
    );
```

---

## 5. Profile Table — Final Shape

After migration, `profiles` becomes a user-settings table (not the tenant anchor):

```sql
-- Final shape
profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,  -- NEW
    onboarded_at TIMESTAMP WITH TIME ZONE,                                        -- NEW

    business_name VARCHAR(255) NOT NULL,       -- Kept for display
    organization_name VARCHAR(255),            -- Kept for display (may be deprecated)
    logo_url TEXT,                             -- Migrate to org-level
    default_from_name VARCHAR(255),            -- Migrate to org-level
    global_tone_preference VARCHAR(50),        -- Per-user preference (stays)
    contact_email VARCHAR(255),                -- User's personal email
    phone_number VARCHAR(50),
    plan_tier VARCHAR(50),                     -- DEPRECATED — moved to organizations
    pricing_model VARCHAR(50),                 -- Stays (user's personal billing agreement)
    timezone VARCHAR(100) DEFAULT 'UTC',
    ...
)
```

**Migration notes:**
- `plan_tier` on profiles becomes deprecated; the source of truth is `organizations.plan_tier`
- `logo_url`, `default_from_name` are organization-level (consistent branding for all team emails)
- `global_tone_preference` stays per-user (each team member can customize their tone)

---

## 6. Migration Strategy

### Phase 3a — Schema Deployed (Backward-Compatible)

1. Run the `organizations` and `organization_members` CREATE TABLE statements
2. Run all ALTER TABLE ADD COLUMN statements (all nullable)
3. Run a data migration script to backfill `organization_id` on existing rows
4. Apply NOT NULL constraints

### Phase 3b — Data Migration Script

```sql
-- Step 1: Create organizations for every existing profile
INSERT INTO public.organizations (id, name, slug, plan_tier, max_members, billing_email)
SELECT
    gen_random_uuid(),
    COALESCE(p.business_name, p.organization_name, 'My Organization'),
    LOWER(REPLACE(COALESCE(p.business_name, 'org-' || SUBSTRING(p.id::text, 1, 8)), ' ', '-')),
    COALESCE(p.plan_tier, 'standard'),
    CASE WHEN p.plan_tier = 'premium' THEN 10 ELSE 1 END,
    p.contact_email
FROM public.profiles p;

-- Step 2: Link each profile to its new organization
-- (Assuming the order matches — use a mapping approach in real migration)
UPDATE public.profiles p
SET organization_id = o.id
FROM public.organizations o
WHERE o.slug = LOWER(REPLACE(COALESCE(p.business_name, 'org-' || SUBSTRING(p.id::text, 1, 8)), ' ', '-'))
  AND p.organization_id IS NULL;

-- Step 3: Create admin membership for each profile
INSERT INTO public.organization_members (organization_id, profile_id, role, invited_by, accepted_at, status)
SELECT
    p.organization_id,
    p.id,
    'admin',
    p.id,
    NOW(),
    'active'
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = p.organization_id AND om.profile_id = p.id
  );

-- Step 4: Backfill organization_id on all business tables
UPDATE public.oauth_connections o SET organization_id = p.organization_id
FROM public.profiles p WHERE o.profile_id = p.id AND o.organization_id IS NULL;

UPDATE public.clients c SET organization_id = p.organization_id
FROM public.profiles p WHERE c.profile_id = p.id AND c.organization_id IS NULL;

UPDATE public.invoices i SET organization_id = p.organization_id
FROM public.profiles p WHERE i.profile_id = p.id AND i.organization_id IS NULL;

UPDATE public.sequences s SET organization_id = p.organization_id
FROM public.profiles p WHERE s.profile_id = p.id AND s.organization_id IS NULL;

-- ... etc. for dunning_campaigns, dunning_email_logs, recoveries, recovery_milestones

-- Step 5: Apply NOT NULL constraints (after confirming backfill completeness)
-- ALTER TABLE public.clients ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE public.invoices ALTER COLUMN organization_id SET NOT NULL;
-- ... (run after verification in a maintenance window)
```

### Phase 3c — API & Application Changes

Backend code changes needed:
1. **Auth middleware/proxy**: After login, resolve user's `organization_id` from profiles table
2. **Supabase queries**: All `.eq('profile_id', user.id)` become `.eq('organization_id', userOrgId)`
3. **Team invitation API**: `POST /api/team/invite` (requires admin role)
4. **Team management API**: `GET /api/team/members`, `DELETE /api/team/members/:id`
5. **Organization settings API**: `GET/PUT /api/organization/settings`
6. **Usage enforcement**: Check `organization.max_members` before accepting invites
7. **OAuth connections**: These belong to the org (shared across the team), not individual users

---

## 7. Role Definitions & Permissions Matrix

| Feature | Admin | Member |
|---|---|---|
| View dashboard & KPIs | ✅ | ✅ |
| View invoices & clients | ✅ | ✅ |
| Launch/pause dunning campaigns | ✅ | ✅ |
| Edit dunning sequences | ✅ | ✅ |
| Connect/disconnect Stripe/QBO | ✅ | ❌ |
| Manage team members | ✅ | ❌ |
| View OAuth tokens | ✅ | ❌ |
| Delete data (invoices, clients) | ✅ | ❌ |
| Change organization settings | ✅ | ❌ |
| Upgrade/downgrade plan | ✅ | ❌ |
| Configure white-labeling | ✅ | ❌ |
| View email logs | ✅ | ✅ (read-only) |
| View recoveries | ✅ | ✅ |

---

## 8. API Endpoints — New & Modified

### New Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/team/members` | Admin/Member | List all members of current org |
| `POST` | `/api/team/invite` | Admin | Send invitation email |
| `DELETE` | `/api/team/members/:id` | Admin | Remove member or revoke invite |
| `PUT` | `/api/team/members/:id/role` | Admin | Change member role |
| `GET` | `/api/organization` | Admin/Member | Get org settings |
| `PUT` | `/api/organization` | Admin | Update org settings (name, branding) |
| `GET` | `/api/invitations/:token` | None | Resolve invite token (public) |
| `POST` | `/api/invitations/:token/accept` | Auth | Accept invitation |

### Modified Endpoints

| Method | Path | Change |
|---|---|---|
| `GET` | `/api/auth/status` | Return `organization_id` and `role` alongside user info |
| `GET` | `/api/config/status` | Include org-level config (plan_tier, max_members) |
| `GET` | `/api/milestones` | Scoped to organization, not individual |

---

## 9. Invitation Flow

```
Admin clicks "Invite Team Member"
  → POST /api/team/invite  { email, role }
  → Creates team_invitations row with unique token
  → Sends email via Resend with accept link:
     https://app.reclaim.ai/invite?token=<uuid>

Recipient clicks link
  → GET /api/invitations/:token
  → Returns organization name + inviter info
  → If not logged in: redirect to signup, then back to accept

Recipient accepts (logged in)
  → POST /api/invitations/:token/accept
  → Validates: token exists, not expired, max_members not exceeded
  → Creates organization_members row with status='active'
  → Deletes/expires invitation token
  → Redirects to dashboard → shows "Welcome to <Org>!"
```

---

## 10. Frontend Impact Summary

For the Fullstack Engineer's reference:

| Page | Change Required |
|---|---|
| **Dashboard** | All server queries switch from `.eq('profile_id', user.id)` → `.eq('organization_id', orgId)` |
| **Settings** | Add "Team" tab with member list + invite UI. Add "Organization" tab for branding. Move OAuth section to admin-only |
| **Sequences** | Add org-scoping. No major UI change needed |
| **Campaigns** | Add org-scoping. Show which team member created/ran each campaign |
| **Login/Signup** | After login, resolve org membership. Show org switcher if multi-org |
| **Invite page** | New `/invite?token=` page with accept flow |

---

## 11. Rollback Plan

If the multi-user migration causes issues:

1. **Schema rollback**: Remove new tables and columns
   ```sql
   DROP TABLE IF EXISTS public.team_invitations;
   DROP TABLE IF EXISTS public.organization_members;
   DROP TABLE IF EXISTS public.organizations;
   ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id;
   ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarded_at;
   ```
2. **Data rollback**: RLS reverts to `auth.uid() = profile_id` — all existing data intact
3. **Code rollback**: Git revert of the multi-user feature branch
4. **No data loss**: All original `profile_id` columns are preserved; `organization_id` is additive

---

## 12. Security Considerations

1. **OAuth token isolation**: Only admins can read `oauth_connections` — prevents token leakage to members
2. **Invite token entropy**: Generated with `gen_random_uuid()` (v4 UUID, 122 bits of entropy) — bruteforce-resistant
3. **Invite expiration**: Tokens expire after 7 days (configurable)
4. **Rate limiting**: Max 10 invites per org per hour (enforced in API layer)
5. **Audit logging**: Consider adding an `audit_logs` table for admin actions (invite, role change, removal)
6. **RLS bypass prevention**: `SECURITY DEFINER` on the `is_org_member` helper requires careful review — ensure it cannot be used for privilege escalation
7. **Cross-org data isolation**: All queries MUST filter by `organization_id` — never trust client-side filtering alone

---

## 13. Performance Considerations

1. **Index strategy**: All `organization_id` columns are indexed (see Section 3.3)
2. **RLS overhead**: The `is_org_member()` function queries `organization_members` which is indexed on both FK columns — sub-millisecond lookup
3. **Materialized views** (future): For large orgs (50k+ invoices), consider materialized views for dashboard KPIs
4. **Connection pooling**: OAuth connections are shared across the org — cache the resolved org ID in the user session to avoid repeated lookups

---

## 14. Migration Order (Recommended Rollout Sequence)

| Step | Description | Risk | Duration |
|---|---|---|---|
| 1 | Deploy new tables + nullable columns | Low | Day 1 |
| 2 | Run data migration (backfill) | Medium | Day 1 (off-peak) |
| 3 | Deploy updated RLS policies | High | Day 2 (maintenance window) |
| 4 | Deploy backend API changes | Medium | Day 2 |
| 5 | Apply NOT NULL constraints | Medium | Day 2 (after verification) |
| 6 | Deploy frontend changes | Low | Day 3 |
| 7 | Enable team invite flow | Low | Day 3 |

---

## 15. Appendix: Complete DDL

```sql
-- ==========================================
-- RECLAIM AI — MULTI-USER SCHEMA ADDITIONS
-- Phase 3: Scaling & Enterprise
-- ==========================================

-- 1. ORGANIZATIONS (Top-Level Tenant)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan_tier VARCHAR(50) DEFAULT 'standard' NOT NULL
        CHECK (plan_tier IN ('standard', 'premium')),
    max_members INTEGER DEFAULT 1 NOT NULL,
    billing_email VARCHAR(255),
    custom_domain VARCHAR(255),
    logo_url TEXT,
    primary_color VARCHAR(7),
    from_name VARCHAR(255),
    from_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ORGANIZATION MEMBERS
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member')),
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active' NOT NULL
        CHECK (status IN ('active', 'invited', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (organization_id, profile_id)
);

-- 3. TEAM INVITATIONS
CREATE TABLE public.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member')),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (organization_id, email)
);

-- 4. HELPER FUNCTION (for RLS)
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID, min_role VARCHAR DEFAULT 'member')
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_members om
        JOIN public.profiles p ON p.id = om.profile_id
        WHERE p.id = auth.uid()
          AND om.organization_id = org_id
          AND om.status = 'active'
          AND (
              min_role = 'member'
              OR (min_role = 'admin' AND om.role = 'admin')
          )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. EXISTING TABLE MODIFICATIONS
ALTER TABLE public.profiles
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    ADD COLUMN onboarded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.oauth_connections    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.clients              ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.invoices             ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.sequences            ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.sequence_steps       ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.dunning_campaigns    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.dunning_email_logs   ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.recoveries           ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.recovery_milestones  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 6. NEW INDEXES
CREATE INDEX idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX idx_org_members_profile ON public.organization_members(profile_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_invitations_org ON public.team_invitations(organization_id);
CREATE INDEX idx_org_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_oauth_org ON public.oauth_connections(organization_id);
CREATE INDEX idx_clients_org ON public.clients(organization_id);
CREATE INDEX idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX idx_sequences_org ON public.sequences(organization_id);
CREATE INDEX idx_campaigns_org ON public.dunning_campaigns(organization_id);
CREATE INDEX idx_email_logs_org ON public.dunning_email_logs(organization_id);
CREATE INDEX idx_recoveries_org ON public.recoveries(organization_id);

-- 7. TRIGGERS FOR NEW TABLES
CREATE TRIGGER trigger_update_organizations BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trigger_update_org_members BEFORE UPDATE ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

*Last updated: 2026-06-29 — Phase 3 Schema Design v1.0*
