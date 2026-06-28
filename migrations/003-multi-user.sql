-- ==========================================
-- RECLAIM AI — MULTI-USER SCHEMA MIGRATION
-- Phase 3: Scaling & Enterprise
-- Apply this AFTER backing up production data
-- ==========================================

BEGIN;

-- ==========================================
-- 1. NEW TABLES
-- ==========================================

-- 1.1 Organizations (Top-Level Tenant)
CREATE TABLE IF NOT EXISTS public.organizations (
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

-- 1.2 Organization Members
CREATE TABLE IF NOT EXISTS public.organization_members (
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

-- 1.3 Team Invitations
CREATE TABLE IF NOT EXISTS public.team_invitations (
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

-- ==========================================
-- 2. HELPER FUNCTION (for RLS)
-- ==========================================

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

-- ==========================================
-- 3. EXISTING TABLE MODIFICATIONS
-- ==========================================

-- 3.1 Profiles — add org link
ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMP WITH TIME ZONE;

-- 3.2 Business tables — add org_id (nullable initially for backfill)
ALTER TABLE IF EXISTS public.oauth_connections    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.clients              ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.invoices             ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.sequences            ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.sequence_steps       ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.dunning_campaigns    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.dunning_email_logs   ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.recoveries           ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.recovery_milestones  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ==========================================
-- 4. NEW INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_profile ON public.organization_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON public.team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_oauth_org ON public.oauth_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_sequences_org ON public.sequences(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON public.dunning_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_org ON public.dunning_email_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_recoveries_org ON public.recoveries(organization_id);

-- ==========================================
-- 5. TRIGGERS
-- ==========================================

CREATE TRIGGER IF NOT EXISTS trigger_update_organizations BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER IF NOT EXISTS trigger_update_org_members BEFORE UPDATE ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

-- ==========================================
-- 6. DATA MIGRATION (run separately after verifying schema)
-- ==========================================
-- Uncomment and run after schema deployment:
--
-- -- 6.1 Create orgs for existing profiles
-- INSERT INTO public.organizations (id, name, slug, plan_tier, max_members, billing_email)
-- SELECT
--     gen_random_uuid(),
--     COALESCE(p.business_name, p.organization_name, 'My Organization'),
--     LOWER(REPLACE(COALESCE(p.business_name, 'org-' || SUBSTRING(p.id::text, 1, 8)), ' ', '-')),
--     COALESCE(p.plan_tier, 'standard'),
--     CASE WHEN p.plan_tier = 'premium' THEN 10 ELSE 1 END,
--     p.contact_email
-- FROM public.profiles p
-- WHERE p.organization_id IS NULL;
--
-- -- 6.2 Link profiles to orgs
-- UPDATE public.profiles p
-- SET organization_id = o.id
-- FROM public.organizations o
-- WHERE o.slug = LOWER(REPLACE(COALESCE(p.business_name, 'org-' || SUBSTRING(p.id::text, 1, 8)), ' ', '-'))
--   AND p.organization_id IS NULL;
--
-- -- 6.3 Create admin memberships
-- INSERT INTO public.organization_members (organization_id, profile_id, role, invited_by, accepted_at, status)
-- SELECT p.organization_id, p.id, 'admin', p.id, NOW(), 'active'
-- FROM public.profiles p
-- WHERE p.organization_id IS NOT NULL
--   AND NOT EXISTS (
--       SELECT 1 FROM public.organization_members om
--       WHERE om.organization_id = p.organization_id AND om.profile_id = p.id
--   );
--
-- -- 6.4 Backfill business tables
-- UPDATE public.oauth_connections o SET organization_id = p.organization_id
-- FROM public.profiles p WHERE o.profile_id = p.id AND o.organization_id IS NULL;
--
-- UPDATE public.clients c SET organization_id = p.organization_id
-- FROM public.profiles p WHERE c.profile_id = p.id AND c.organization_id IS NULL;
--
-- UPDATE public.invoices i SET organization_id = p.organization_id
-- FROM public.profiles p WHERE i.profile_id = p.id AND i.organization_id IS NULL;
--
-- UPDATE public.sequences s SET organization_id = p.organization_id
-- FROM public.profiles p WHERE s.profile_id = p.id AND s.organization_id IS NULL;
--
-- UPDATE public.dunning_campaigns dc SET organization_id = p.organization_id
-- FROM public.profiles p WHERE dc.profile_id = p.id AND dc.organization_id IS NULL;
--
-- UPDATE public.dunning_email_logs dl SET organization_id = dc.organization_id
-- FROM public.dunning_campaigns dc WHERE dl.campaign_id = dc.id AND dl.organization_id IS NULL;
--
-- UPDATE public.recoveries r SET organization_id = p.organization_id
-- FROM public.profiles p WHERE r.profile_id = p.id AND r.organization_id IS NULL;
--
-- UPDATE public.recovery_milestones rm SET organization_id = p.organization_id
-- FROM public.profiles p WHERE rm.profile_id = p.id AND rm.organization_id IS NULL;
