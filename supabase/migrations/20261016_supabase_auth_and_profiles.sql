-- ==============================================================================
-- SAFEJOURNEY: PRODUCTION SUPABASE AUTHENTICATION & DATABASE SCHEMA
-- Handles Email & Password Auth, Phone Number OTP, Profiles Auto-Provisioning,
-- Row Level Security (RLS), and Private Evidence Storage.
-- ==============================================================================

-- 1. PUBLIC PROFILES TABLE (Linked directly to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    blood_group TEXT DEFAULT 'B+',
    emergency_note TEXT DEFAULT '',
    pin_hash TEXT DEFAULT '1234',
    duress_pin_hash TEXT DEFAULT '9999',
    theme TEXT DEFAULT 'light',
    device_view TEXT DEFAULT 'web',
    onboarding_completed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AUTOMATIC PROFILE PROVISIONING TRIGGER (Fires on Email Signup or Phone OTP Login)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    email,
    phone,
    blood_group,
    pin_hash,
    duress_pin_hash,
    theme,
    device_view,
    onboarding_completed,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'Journey Guard User'
    ),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.phone, ''),
    'B+',
    '1234',
    '9999',
    'light',
    'web',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE public.profiles.email END,
    phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. TRUSTED CONTACTS
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT NOT NULL DEFAULT 'Other',
    is_primary BOOLEAN DEFAULT false,
    notify_on_journey_start BOOLEAN DEFAULT true,
    notify_on_deviation BOOLEAN DEFAULT true,
    notify_on_sos BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. JOURNEYS
CREATE TABLE IF NOT EXISTS public.journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    origin_name TEXT NOT NULL,
    destination_name TEXT NOT NULL,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    transport_mode TEXT NOT NULL DEFAULT 'cab',
    status TEXT NOT NULL DEFAULT 'JOURNEY_ACTIVE',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    distance_km DOUBLE PRECISION DEFAULT 0,
    deviation_threshold_meters INTEGER DEFAULT 500,
    stop_timeout_seconds INTEGER DEFAULT 300,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EMERGENCY EVENTS
CREATE TABLE IF NOT EXISTS public.emergency_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    journey_id UUID REFERENCES public.journeys(id) ON DELETE SET NULL,
    trigger_reason TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION NOT NULL DEFAULT 10,
    google_maps_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'BROADCASTING',
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EVIDENCE METADATA
CREATE TABLE IF NOT EXISTS public.evidence_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    journey_id UUID REFERENCES public.journeys(id) ON DELETE SET NULL,
    emergency_event_id UUID REFERENCES public.emergency_events(id) ON DELETE SET NULL,
    evidence_type TEXT NOT NULL, -- 'video', 'audio', 'incident_report'
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    sha256_hash TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    recorded_lat DOUBLE PRECISION NOT NULL,
    recorded_lng DOUBLE PRECISION NOT NULL,
    recorded_address TEXT,
    notes TEXT,
    upload_status TEXT NOT NULL DEFAULT 'UPLOADED',
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUDIT EVENTS & EVIDENCE DELETION AUDIT
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.evidence_deletion_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    evidence_id UUID,
    status TEXT NOT NULL,
    reason TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_deletion_audit ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users manage only their own row
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Trusted Contacts: Users manage only their contacts
DROP POLICY IF EXISTS "Users can view own contacts" ON public.trusted_contacts;
CREATE POLICY "Users can view own contacts" ON public.trusted_contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own contacts" ON public.trusted_contacts;
CREATE POLICY "Users can insert own contacts" ON public.trusted_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own contacts" ON public.trusted_contacts;
CREATE POLICY "Users can update own contacts" ON public.trusted_contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own contacts" ON public.trusted_contacts;
CREATE POLICY "Users can delete own contacts" ON public.trusted_contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Journeys: Users manage only their journeys
DROP POLICY IF EXISTS "Users view own journeys" ON public.journeys;
CREATE POLICY "Users view own journeys" ON public.journeys FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own journeys" ON public.journeys;
CREATE POLICY "Users insert own journeys" ON public.journeys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own journeys" ON public.journeys;
CREATE POLICY "Users update own journeys" ON public.journeys FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Emergency Events & Evidence
DROP POLICY IF EXISTS "Users view own emergency events" ON public.emergency_events;
CREATE POLICY "Users view own emergency events" ON public.emergency_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own emergency events" ON public.emergency_events;
CREATE POLICY "Users insert own emergency events" ON public.emergency_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own evidence" ON public.evidence_metadata;
CREATE POLICY "Users view own evidence" ON public.evidence_metadata FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own evidence" ON public.evidence_metadata;
CREATE POLICY "Users insert own evidence" ON public.evidence_metadata FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own evidence" ON public.evidence_metadata;
CREATE POLICY "Users delete own evidence" ON public.evidence_metadata FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Audit logs
DROP POLICY IF EXISTS "Users view own audit events" ON public.audit_events;
CREATE POLICY "Users view own audit events" ON public.audit_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert audit events" ON public.audit_events;
CREATE POLICY "Users insert audit events" ON public.audit_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view deletion audits" ON public.evidence_deletion_audit;
CREATE POLICY "Users view deletion audits" ON public.evidence_deletion_audit FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert deletion audits" ON public.evidence_deletion_audit;
CREATE POLICY "Users insert deletion audits" ON public.evidence_deletion_audit FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 8. EVIDENCE STORAGE BUCKET CONFIGURATION
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence-vault', 'evidence-vault', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Authenticated Uploads
DROP POLICY IF EXISTS "Authenticated users upload evidence" ON storage.objects;
CREATE POLICY "Authenticated users upload evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'evidence-vault');

DROP POLICY IF EXISTS "Users read own evidence recordings" ON storage.objects;
CREATE POLICY "Users read own evidence recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'evidence-vault');

DROP POLICY IF EXISTS "Users delete own evidence recordings" ON storage.objects;
CREATE POLICY "Users delete own evidence recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'evidence-vault');
