-- ==============================================================================
-- SAFEJOURNEY CORE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- PostgreSQL + Supabase Authentication & Private Storage Configuration
-- ==============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    blood_group TEXT,
    emergency_note TEXT,
    pin_hash TEXT NOT NULL,
    duress_pin_hash TEXT,
    theme TEXT DEFAULT 'light',
    device_view TEXT DEFAULT 'web',
    onboarding_completed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TRUSTED CONTACTS TABLE
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    notify_on_journey_start BOOLEAN DEFAULT true,
    notify_on_deviation BOOLEAN DEFAULT true,
    notify_on_sos BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. JOURNEYS TABLE
CREATE TABLE IF NOT EXISTS public.journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
    distance_km DOUBLE PRECISION,
    deviation_threshold_meters INTEGER DEFAULT 500,
    stop_timeout_seconds INTEGER DEFAULT 300,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. JOURNEY ROUTE POINTS (Expected Route Geometry)
CREATE TABLE IF NOT EXISTS public.journey_route_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. JOURNEY LOCATIONS (Live Permitted GPS Tracking Updates)
CREATE TABLE IF NOT EXISTS public.journey_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION,
    deviation_distance_meters DOUBLE PRECISION DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EMERGENCY EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.emergency_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    journey_id UUID REFERENCES public.journeys(id) ON DELETE SET NULL,
    trigger_reason TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION NOT NULL,
    google_maps_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'BROADCASTING',
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EVIDENCE METADATA TABLE (Video & Audio Recording Catalog)
CREATE TABLE IF NOT EXISTS public.evidence_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- 8. NOTIFICATION ATTEMPTS TABLE (SMS / WhatsApp Dispatch Logs)
CREATE TABLE IF NOT EXISTS public.notification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_event_id UUID NOT NULL REFERENCES public.emergency_events(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.trusted_contacts(id) ON DELETE SET NULL,
    contact_phone TEXT NOT NULL,
    channel TEXT NOT NULL, -- 'SMS', 'WHATSAPP'
    provider TEXT NOT NULL DEFAULT 'Twilio/Simulated',
    status TEXT NOT NULL, -- 'SENT', 'DELIVERED', 'FAILED'
    attempt_count INTEGER DEFAULT 1,
    provider_response TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SAFETY CONFIRMATIONS TABLE
CREATE TABLE IF NOT EXISTS public.safety_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    journey_id UUID REFERENCES public.journeys(id) ON DELETE SET NULL,
    confirmation_type TEXT NOT NULL, -- 'SAFE_CONFIRMED', 'JOURNEY_DEACTIVATED'
    is_duress BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. EVIDENCE DELETION AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.evidence_deletion_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL,
    status TEXT NOT NULL, -- 'SUCCESS', 'FAILED_AUTH', 'BLOCKED_ACTIVE_EMERGENCY'
    reason TEXT,
    client_ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON public.trusted_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_journeys_user ON public.journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_locations_journey ON public.journey_locations(journey_id);
CREATE INDEX IF NOT EXISTS idx_evidence_metadata_user ON public.evidence_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_events_user ON public.emergency_events(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_deletion_audit_user ON public.evidence_deletion_audit(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enforces personal data isolation so users can never read/alter another user's records
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

-- Profiles: Users manage only their own profile
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trusted Contacts: Users manage only their own contacts
CREATE POLICY "Users view own contacts" ON public.trusted_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own contacts" ON public.trusted_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own contacts" ON public.trusted_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own contacts" ON public.trusted_contacts FOR DELETE USING (auth.uid() = user_id);

-- Journeys: User personal journeys
CREATE POLICY "Users view own journeys" ON public.journeys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own journeys" ON public.journeys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own journeys" ON public.journeys FOR UPDATE USING (auth.uid() = user_id);

-- Evidence Metadata: User owns their recordings
CREATE POLICY "Users view own evidence" ON public.evidence_metadata FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own evidence" ON public.evidence_metadata FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own evidence" ON public.evidence_metadata FOR DELETE USING (auth.uid() = user_id);

-- Deletion Audit: User can only view their own deletion audit logs
CREATE POLICY "Users view own deletion audit" ON public.evidence_deletion_audit FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert deletion audit" ON public.evidence_deletion_audit FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- STORAGE BUCKET CONFIGURATION FOR PRIVATE EVIDENCE
-- ==============================================================================
-- Insert private storage bucket for encrypted videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence-vault', 'evidence-vault', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Authenticated users can upload and read their own folder objects
CREATE POLICY "Authenticated users upload evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'evidence-vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own evidence recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'evidence-vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own evidence recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'evidence-vault' AND auth.uid()::text = (storage.foldername(name))[1]);
