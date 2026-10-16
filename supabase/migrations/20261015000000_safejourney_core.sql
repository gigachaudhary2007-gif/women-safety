-- ==============================================================================
-- SAFEJOURNEY (JOURNEY GUARD) COMPLETE PRODUCTION DATABASE MIGRATION
-- Robust, Idempotent (Re-runnable without duplicate policy errors), 
-- Strict Row Level Security (RLS) & Private Evidence Vault Configuration.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PUBLIC PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    blood_group TEXT DEFAULT 'B+',
    emergency_note TEXT DEFAULT '',
    pin_hash TEXT NOT NULL DEFAULT '1234',
    duress_pin_hash TEXT DEFAULT '9999',
    theme TEXT DEFAULT 'light',
    device_view TEXT DEFAULT 'web',
    onboarding_completed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatic Profile Provisioning Trigger (Runs on Email Signup or Phone OTP Login)
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

-- ==============================================================================
-- 2. TRUSTED CONTACTS TABLE
-- ==============================================================================
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

-- ==============================================================================
-- 3. JOURNEYS TABLE
-- ==============================================================================
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

-- ==============================================================================
-- 4. JOURNEY ROUTE POINTS (Expected Corridors)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.journey_route_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. JOURNEY LOCATIONS (Live Breadcrumb GPS Pings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.journey_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION,
    deviation_distance_meters DOUBLE PRECISION DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. EMERGENCY EVENTS TABLE (Distress & Beacon Broadcasts)
-- ==============================================================================
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

-- ==============================================================================
-- 7. EVIDENCE METADATA TABLE (Video & Audio Catalog)
-- ==============================================================================
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

-- ==============================================================================
-- 8. NOTIFICATION ATTEMPTS TABLE (SMS / WhatsApp Dispatch Logs)
-- Real delivery status; marked as PROVIDER_UNCONFIGURED unless real backend provider is wired
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_event_id UUID NOT NULL REFERENCES public.emergency_events(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.trusted_contacts(id) ON DELETE SET NULL,
    contact_phone TEXT NOT NULL,
    channel TEXT NOT NULL, -- 'SMS', 'WHATSAPP'
    provider TEXT NOT NULL DEFAULT 'Unconfigured Provider',
    status TEXT NOT NULL DEFAULT 'PROVIDER_UNCONFIGURED', -- 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'PROVIDER_UNCONFIGURED'
    attempt_count INTEGER DEFAULT 1,
    provider_response TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. SAFETY CONFIRMATIONS TABLE (Duress & Safe PIN Audit)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.safety_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    journey_id UUID REFERENCES public.journeys(id) ON DELETE SET NULL,
    confirmation_type TEXT NOT NULL, -- 'SAFE_CONFIRMED', 'JOURNEY_DEACTIVATED'
    is_duress BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. EVIDENCE DELETION AUDIT TABLE (Tamper-Resistant Security Trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.evidence_deletion_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    evidence_id UUID,
    status TEXT NOT NULL, -- 'SUCCESS', 'FAILED_AUTH', 'BLOCKED_ACTIVE_EMERGENCY'
    reason TEXT,
    client_ip TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. AUDIT EVENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON public.trusted_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_journeys_user ON public.journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_route_points_journey ON public.journey_route_points(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_locations_journey ON public.journey_locations(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_locations_user ON public.journey_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_metadata_user ON public.evidence_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_events_user ON public.emergency_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_attempts_emergency ON public.notification_attempts(emergency_event_id);
CREATE INDEX IF NOT EXISTS idx_safety_confirmations_user ON public.safety_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_deletion_audit_user ON public.evidence_deletion_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_user ON public.audit_events(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Authenticated users can only read & modify their own records.
-- Drop existing policies first to guarantee safe re-runnability without errors.
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_route_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_deletion_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles
    FOR DELETE TO authenticated USING (auth.uid() = id);

-- 2. Trusted Contacts Policies
DROP POLICY IF EXISTS "Users can view own contacts" ON public.trusted_contacts;
CREATE POLICY "Users can view own contacts" ON public.trusted_contacts
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own contacts" ON public.trusted_contacts;
CREATE POLICY "Users can insert own contacts" ON public.trusted_contacts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own contacts" ON public.trusted_contacts;
CREATE POLICY "Users can update own contacts" ON public.trusted_contacts
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own contacts" ON public.trusted_contacts;
CREATE POLICY "Users can delete own contacts" ON public.trusted_contacts
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Journeys Policies
DROP POLICY IF EXISTS "Users can view own journeys" ON public.journeys;
CREATE POLICY "Users can view own journeys" ON public.journeys
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own journeys" ON public.journeys;
CREATE POLICY "Users can insert own journeys" ON public.journeys
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own journeys" ON public.journeys;
CREATE POLICY "Users can update own journeys" ON public.journeys
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own journeys" ON public.journeys;
CREATE POLICY "Users can delete own journeys" ON public.journeys
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Journey Route Points Policies (Linked through journey ownership)
DROP POLICY IF EXISTS "Users can view own journey route points" ON public.journey_route_points;
CREATE POLICY "Users can view own journey route points" ON public.journey_route_points
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.journeys
            WHERE journeys.id = journey_route_points.journey_id
            AND journeys.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own journey route points" ON public.journey_route_points;
CREATE POLICY "Users can insert own journey route points" ON public.journey_route_points
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.journeys
            WHERE journeys.id = journey_route_points.journey_id
            AND journeys.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own journey route points" ON public.journey_route_points;
CREATE POLICY "Users can delete own journey route points" ON public.journey_route_points
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.journeys
            WHERE journeys.id = journey_route_points.journey_id
            AND journeys.user_id = auth.uid()
        )
    );

-- 5. Journey Locations Policies
DROP POLICY IF EXISTS "Users can view own journey locations" ON public.journey_locations;
CREATE POLICY "Users can view own journey locations" ON public.journey_locations
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own journey locations" ON public.journey_locations;
CREATE POLICY "Users can insert own journey locations" ON public.journey_locations
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 6. Emergency Events Policies
DROP POLICY IF EXISTS "Users can view own emergency events" ON public.emergency_events;
CREATE POLICY "Users can view own emergency events" ON public.emergency_events
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own emergency events" ON public.emergency_events;
CREATE POLICY "Users can insert own emergency events" ON public.emergency_events
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own emergency events" ON public.emergency_events;
CREATE POLICY "Users can update own emergency events" ON public.emergency_events
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 7. Notification Attempts Policies (Linked through emergency event ownership)
DROP POLICY IF EXISTS "Users can view own notification attempts" ON public.notification_attempts;
CREATE POLICY "Users can view own notification attempts" ON public.notification_attempts
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.emergency_events
            WHERE emergency_events.id = notification_attempts.emergency_event_id
            AND emergency_events.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own notification attempts" ON public.notification_attempts;
CREATE POLICY "Users can insert own notification attempts" ON public.notification_attempts
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.emergency_events
            WHERE emergency_events.id = notification_attempts.emergency_event_id
            AND emergency_events.user_id = auth.uid()
        )
    );

-- 8. Safety Confirmations Policies
DROP POLICY IF EXISTS "Users can view own safety confirmations" ON public.safety_confirmations;
CREATE POLICY "Users can view own safety confirmations" ON public.safety_confirmations
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own safety confirmations" ON public.safety_confirmations;
CREATE POLICY "Users can insert own safety confirmations" ON public.safety_confirmations
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 9. Evidence Metadata Policies
DROP POLICY IF EXISTS "Users can view own evidence metadata" ON public.evidence_metadata;
CREATE POLICY "Users can view own evidence metadata" ON public.evidence_metadata
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own evidence metadata" ON public.evidence_metadata;
CREATE POLICY "Users can insert own evidence metadata" ON public.evidence_metadata
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own evidence metadata" ON public.evidence_metadata;
CREATE POLICY "Users can update own evidence metadata" ON public.evidence_metadata
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own evidence metadata" ON public.evidence_metadata;
CREATE POLICY "Users can delete own evidence metadata" ON public.evidence_metadata
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 10. Evidence Deletion Audit Policies
DROP POLICY IF EXISTS "Users can view own deletion audit" ON public.evidence_deletion_audit;
CREATE POLICY "Users can view own deletion audit" ON public.evidence_deletion_audit
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own deletion audit" ON public.evidence_deletion_audit;
CREATE POLICY "Users can insert own deletion audit" ON public.evidence_deletion_audit
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 11. Audit Events Policies
DROP POLICY IF EXISTS "Users can view own audit events" ON public.audit_events;
CREATE POLICY "Users can view own audit events" ON public.audit_events
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own audit events" ON public.audit_events;
CREATE POLICY "Users can insert own audit events" ON public.audit_events
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ==============================================================================
-- 12. STORAGE BUCKET CONFIGURATION FOR PRIVATE EVIDENCE VAULT
-- Encrypted Video/Audio Recordings stored under: {auth.uid()}/{fileName}
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence-vault', 'evidence-vault', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies (Folder isolation enforced: storage.foldername(name)[1] == auth.uid()::text)
DROP POLICY IF EXISTS "Authenticated users upload evidence recordings" ON storage.objects;
CREATE POLICY "Authenticated users upload evidence recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'evidence-vault' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users read own evidence recordings" ON storage.objects;
CREATE POLICY "Users read own evidence recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'evidence-vault' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users update own evidence recordings" ON storage.objects;
CREATE POLICY "Users update own evidence recordings"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'evidence-vault' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete own evidence recordings" ON storage.objects;
CREATE POLICY "Users delete own evidence recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'evidence-vault' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
