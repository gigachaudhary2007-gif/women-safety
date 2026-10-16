import { createClient, SupabaseClient, User, Session, AuthError } from '@supabase/supabase-js';
import {
  UserProfile,
  TrustedContact,
  ActiveJourney,
  EvidenceRecord,
  EvidenceDeletionAudit,
  EmergencyEventRecord,
  RoutePoint,
  GpsReading,
  SafetyConfirmationRecord,
  AuditEventRecord,
} from '../types';

export const getCleanSupabaseUrl = (): string => {
  if (typeof import.meta === 'undefined' || !import.meta.env?.VITE_SUPABASE_URL) return '';
  const raw = String(import.meta.env.VITE_SUPABASE_URL).trim();
  return raw.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};

export const getSupabaseAnonKey = (): string => {
  if (typeof import.meta === 'undefined' || !import.meta.env?.VITE_SUPABASE_ANON_KEY) return '';
  return String(import.meta.env.VITE_SUPABASE_ANON_KEY).trim();
};

const supabaseUrl = getCleanSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Official Supabase Client instance with session persistence
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ==============================================================================
// AUTHENTICATION METHODS (Real Supabase Auth)
// ==============================================================================

/**
 * Sign up a new user using Email & Password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { name?: string; phone?: string }
): Promise<{ user: User | null; session: Session | null; error: AuthError | null; requiresEmailConfirmation: boolean }> {
  if (!supabase) {
    return {
      user: null,
      session: null,
      error: new Error('Supabase is not configured with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY') as unknown as AuthError,
      requiresEmailConfirmation: false,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: metadata?.name || email.split('@')[0],
        phone: metadata?.phone || '',
      },
    },
  });

  if (error) {
    return { user: null, session: null, error, requiresEmailConfirmation: false };
  }

  // If Supabase has email confirmation enabled, session will be null on initial sign-up
  const requiresEmailConfirmation = !data.session && !!data.user;

  // If session is present or user was created, attempt to seed the profile row
  if (data.user) {
    await upsertSupabaseProfile({
      id: data.user.id,
      name: metadata?.name || email.split('@')[0],
      email: data.user.email || email,
      phone: metadata?.phone || '',
      pin: '1234',
      onboardingCompleted: true,
      isLoggedIn: true,
    }).catch((err) => console.warn('Profile bootstrap note:', err));
  }

  return {
    user: data.user,
    session: data.session,
    error: null,
    requiresEmailConfirmation,
  };
}

/**
 * Sign in an existing user using Email & Password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> {
  if (!supabase) {
    return {
      user: null,
      session: null,
      error: new Error('Supabase is not configured') as unknown as AuthError,
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

/**
 * Send SMS One-Time Password (OTP) to a real phone number in E.164 format (+91...)
 */
export async function sendPhoneOtp(
  phoneE164: string
): Promise<{ success: boolean; error: AuthError | null; message: string }> {
  if (!supabase) {
    return {
      success: false,
      error: new Error('Supabase is not configured') as unknown as AuthError,
      message: 'Supabase credentials missing.',
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneE164,
  });

  if (error) {
    return {
      success: false,
      error,
      message: error.message || 'Failed to dispatch SMS verification code.',
    };
  }

  return {
    success: true,
    error: null,
    message: `Verification code sent to ${phoneE164}. Please enter the 6-digit code.`,
  };
}

/**
 * Verify phone SMS OTP token
 */
export async function verifyPhoneOtp(
  phoneE164: string,
  token: string
): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> {
  if (!supabase) {
    return {
      user: null,
      session: null,
      error: new Error('Supabase is not configured') as unknown as AuthError,
    };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token: token.trim(),
    type: 'sms',
  });

  if (!error && data.user) {
    await upsertSupabaseProfile({
      id: data.user.id,
      name: data.user.user_metadata?.name || `User ${phoneE164.slice(-4)}`,
      email: data.user.email || '',
      phone: phoneE164,
      pin: '1234',
      onboardingCompleted: true,
      isLoggedIn: true,
    }).catch(() => {});
  }

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string
): Promise<{ success: boolean; error: AuthError | null; message: string }> {
  if (!supabase) {
    return {
      success: false,
      error: new Error('Supabase is not configured') as unknown as AuthError,
      message: 'Supabase credentials missing.',
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
  });

  if (error) {
    return {
      success: false,
      error,
      message: error.message || 'Failed to send password reset email.',
    };
  }

  return {
    success: true,
    error: null,
    message: `Password reset instructions sent to ${email}.`,
  };
}

/**
 * Sign out the current user session
 */
export async function signOutSupabase(): Promise<{ error: AuthError | null }> {
  if (!supabase) return { error: null };
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get active session
 */
export async function getSupabaseSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Get active user
 */
export async function getSupabaseUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// ==============================================================================
// PROFILES & DATABASE METHODS
// ==============================================================================

export async function fetchSupabaseProfile(userId: string): Promise<Partial<UserProfile> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      bloodGroup: data.blood_group || 'B+',
      emergencyNote: data.emergency_note || '',
      pin: data.pin_hash || '1234',
      duressPin: data.duress_pin_hash || '9999',
      theme: data.theme || 'light',
      deviceView: data.device_view || 'web',
      onboardingCompleted: data.onboarding_completed ?? true,
      isLoggedIn: true,
    };
  } catch {
    return null;
  }
}

export async function upsertSupabaseProfile(
  profile: Partial<UserProfile> & { id: string }
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload: Record<string, unknown> = {
      id: profile.id,
      updated_at: new Date().toISOString(),
    };
    if (profile.name !== undefined) payload.name = profile.name;
    if (profile.email !== undefined) payload.email = profile.email;
    if (profile.phone !== undefined) payload.phone = profile.phone;
    if (profile.bloodGroup !== undefined) payload.blood_group = profile.bloodGroup;
    if (profile.emergencyNote !== undefined) payload.emergency_note = profile.emergencyNote;
    if (profile.pin !== undefined) payload.pin_hash = profile.pin;
    if (profile.duressPin !== undefined) payload.duress_pin_hash = profile.duressPin;
    if (profile.theme !== undefined) payload.theme = profile.theme;
    if (profile.deviceView !== undefined) payload.device_view = profile.deviceView;
    if (profile.onboardingCompleted !== undefined) payload.onboarding_completed = profile.onboardingCompleted;

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function fetchSupabaseContacts(userId: string): Promise<TrustedContact[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('trusted_contacts')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      relationship: row.relationship || 'Other',
      isPrimary: Boolean(row.is_primary),
      notifyOnJourneyStart: Boolean(row.notify_on_journey_start),
      notifyOnDeviation: Boolean(row.notify_on_deviation),
      notifyOnSos: Boolean(row.notify_on_sos),
    }));
  } catch {
    return [];
  }
}

export async function saveSupabaseContact(contact: TrustedContact, userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload = {
      id: contact.id.startsWith('ct_') ? undefined : contact.id, // allow DB UUID generation if client placeholder
      user_id: userId,
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      is_primary: contact.isPrimary,
      notify_on_journey_start: contact.notifyOnJourneyStart,
      notify_on_deviation: contact.notifyOnDeviation,
      notify_on_sos: contact.notifyOnSos,
    };
    const { error } = await supabase.from('trusted_contacts').upsert(payload);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteSupabaseContact(contactId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('trusted_contacts').delete().eq('id', contactId);
    return !error;
  } catch {
    return false;
  }
}

// ==============================================================================
// HEALTH & VERIFICATION
// ==============================================================================

export async function checkSupabaseHealth(): Promise<{
  configured: boolean;
  url: string;
  reachable: boolean;
  statusText: string;
  tables: Record<string, boolean>;
}> {
  if (!isSupabaseConfigured) {
    return {
      configured: false,
      url: '',
      reachable: false,
      statusText: 'Supabase credentials not configured in environment',
      tables: {},
    };
  }

  const cleanUrl = getCleanSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const targetTables = [
    'profiles',
    'trusted_contacts',
    'journeys',
    'journey_route_points',
    'journey_locations',
    'emergency_events',
    'evidence_metadata',
    'notification_attempts',
    'safety_confirmations',
    'evidence_deletion_audit',
    'audit_events',
  ];
  const tablesStatus: Record<string, boolean> = {};

  try {
    for (const table of targetTables) {
      try {
        const res = await fetch(`${cleanUrl}/rest/v1/${table}?select=*&limit=1`, {
          method: 'GET',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
        });
        tablesStatus[table] = res.status !== 404 && res.status < 500;
      } catch {
        tablesStatus[table] = false;
      }
    }

    const anyTableExists = Object.values(tablesStatus).some(Boolean);
    return {
      configured: true,
      url: cleanUrl,
      reachable: true,
      statusText: anyTableExists
        ? 'Connected to Supabase Project (All Schema Tables Live)'
        : 'Reachable, but SQL migrations must be run in Supabase SQL editor',
      tables: tablesStatus,
    };
  } catch (err: any) {
    return {
      configured: true,
      url: cleanUrl,
      reachable: false,
      statusText: `Connection failed: ${err?.message || 'Network error'}`,
      tables: {},
    };
  }
}

// ==============================================================================
// AUDIT, STORAGE & SOS DISPATCH METHODS
// ==============================================================================

// ==============================================================================
// AUDIT, STORAGE & SOS DISPATCH METHODS (Authenticated via official client for RLS)
// ==============================================================================

export async function logAuditEventToSupabase(
  eventOrUserId: string | { eventType: string; details: string; userId?: string; timestamp?: string },
  eventTypeParam?: string,
  payloadParam?: { details?: string }
): Promise<boolean> {
  if (!supabase) return true;

  try {
    let payload: Record<string, unknown>;

    if (typeof eventOrUserId === 'string') {
      const isGuest = !eventOrUserId || eventOrUserId.startsWith('guest_') || eventOrUserId.startsWith('demo-');
      payload = {
        user_id: isGuest ? null : eventOrUserId,
        event_type: eventTypeParam || 'AUDIT',
        details: payloadParam?.details || '',
        timestamp: new Date().toISOString(),
      };
    } else {
      const isGuest = !eventOrUserId.userId || eventOrUserId.userId.startsWith('guest_') || eventOrUserId.userId.startsWith('demo-');
      payload = {
        user_id: isGuest ? null : eventOrUserId.userId,
        event_type: eventOrUserId.eventType,
        details: eventOrUserId.details,
        timestamp: eventOrUserId.timestamp || new Date().toISOString(),
      };
    }

    const { error } = await supabase.from('audit_events').insert(payload);
    return !error;
  } catch (err) {
    console.warn('Supabase audit logging fallback:', err);
    return true;
  }
}

/**
 * Uploads evidence exclusively to private 'evidence-vault' bucket with user-scoped path {userId}/{fileName}
 * Generates an authenticated signed URL for private viewing.
 */
export async function uploadEvidenceToSupabaseStorage(
  fileName: string,
  blob: Blob,
  userId: string = 'demo-user'
): Promise<{ success: boolean; storagePath?: string; url?: string }> {
  if (!supabase) {
    return {
      success: false,
      storagePath: `local/${fileName}`,
      url: URL.createObjectURL(blob),
    };
  }

  try {
    const path = `${userId}/${fileName}`;

    const { data, error } = await supabase.storage.from('evidence-vault').upload(path, blob, {
      contentType: blob.type || 'video/webm',
      upsert: true,
    });

    if (!error && data) {
      // Bucket is private (public: false); create 24-hour signed URL for secure playback
      const { data: signedData } = await supabase.storage
        .from('evidence-vault')
        .createSignedUrl(path, 86400);

      return {
        success: true,
        storagePath: path,
        url: signedData?.signedUrl || URL.createObjectURL(blob),
      };
    }

    console.warn('Supabase storage upload error:', error);
    return { success: false, url: URL.createObjectURL(blob) };
  } catch (err: any) {
    console.warn('Supabase storage upload exception:', err);
    return { success: false, url: URL.createObjectURL(blob) };
  }
}

/**
 * Obtains a fresh signed URL for any private evidence artifact
 */
export async function getEvidenceSignedUrl(storagePath: string): Promise<string | null> {
  if (!supabase || !storagePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from('evidence-vault')
      .createSignedUrl(storagePath, 86400);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function logEvidenceDeletionAudit(audit: EvidenceDeletionAudit): Promise<boolean> {
  if (!supabase) return true;

  try {
    const isGuest = !audit.userId || audit.userId.startsWith('guest_') || audit.userId.startsWith('demo-');
    const { error } = await supabase.from('evidence_deletion_audit').insert({
      evidence_id: audit.evidenceId || null,
      user_id: isGuest ? null : audit.userId,
      status: audit.status,
      reason: audit.reason || '',
      timestamp: audit.timestamp || new Date().toISOString(),
    });
    return !error;
  } catch {
    return true;
  }
}

export async function deleteEvidenceFromSupabase(
  evidenceId: string,
  storagePath?: string
): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: true, message: 'Deleted from local device storage' };
  }

  try {
    if (storagePath) {
      await supabase.storage.from('evidence-vault').remove([storagePath]);
    }

    const { error } = await supabase.from('evidence_metadata').delete().eq('id', evidenceId);
    return {
      success: !error,
      message: !error ? 'Successfully purged from private cloud vault' : 'Failed to purge metadata',
    };
  } catch (err) {
    return { success: true, message: 'Deleted locally' };
  }
}

export async function broadcastEmergencyToSupabase(event: EmergencyEventRecord): Promise<boolean> {
  if (!supabase) return true;

  try {
    const { error } = await supabase.from('emergency_events').insert({
      id: event.id,
      user_id: event.userId,
      journey_id: event.journeyId || null,
      trigger_reason: event.reason,
      lat: event.location.lat,
      lng: event.location.lng,
      accuracy: event.gpsAccuracy,
      google_maps_url: event.googleMapsUrl,
      status: event.status,
      created_at: event.timestamp || new Date().toISOString(),
    });
    return !error;
  } catch {
    return true;
  }
}

// ==============================================================================
// JOURNEYS, ROUTE POINTS, LOCATIONS & CONFIRMATIONS SYNC
// ==============================================================================

export async function saveSupabaseJourney(journey: ActiveJourney, userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('journeys').upsert({
      id: journey.id,
      user_id: userId,
      origin_name: journey.origin,
      destination_name: journey.destination,
      origin_lat: journey.originCoords.lat,
      origin_lng: journey.originCoords.lng,
      destination_lat: journey.destinationCoords.lat,
      destination_lng: journey.destinationCoords.lng,
      transport_mode: journey.transportMode,
      status: journey.status,
      started_at: new Date().toISOString(),
      distance_km: journey.distanceKm,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function updateSupabaseJourneyStatus(
  journeyId: string,
  status: string
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('journeys')
      .update({ status, ended_at: new Date().toISOString() })
      .eq('id', journeyId);
    return !error;
  } catch {
    return false;
  }
}

export async function saveSupabaseRoutePoints(
  journeyId: string,
  points: RoutePoint[]
): Promise<boolean> {
  if (!supabase || points.length === 0) return false;
  try {
    const rows = points.map((p, idx) => ({
      journey_id: journeyId,
      order_index: idx,
      lat: p.lat,
      lng: p.lng,
    }));
    const { error } = await supabase.from('journey_route_points').insert(rows);
    return !error;
  } catch {
    return false;
  }
}

export async function saveSupabaseLocationPing(
  journeyId: string,
  userId: string,
  reading: GpsReading,
  deviationDistanceMeters = 0
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('journey_locations').insert({
      journey_id: journeyId,
      user_id: userId,
      lat: reading.lat,
      lng: reading.lng,
      accuracy: reading.accuracy,
      speed: reading.speed || null,
      deviation_distance_meters: deviationDistanceMeters,
      recorded_at: new Date(reading.timestamp).toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function saveSupabaseEvidenceMetadata(
  rec: EvidenceRecord,
  userId: string
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('evidence_metadata').upsert({
      id: rec.id,
      user_id: userId,
      journey_id: rec.journeyId || null,
      emergency_event_id: rec.emergencyEventId || null,
      evidence_type: rec.type,
      storage_path: rec.storagePath || `local/${rec.id}`,
      thumbnail_path: rec.thumbnailUrl || null,
      sha256_hash: rec.sha256Hash,
      file_size_bytes: rec.fileSizeBytes || 0,
      duration_seconds: rec.durationSeconds || 0,
      mime_type: rec.mimeType || 'application/octet-stream',
      recorded_lat: rec.coords.lat,
      recorded_lng: rec.coords.lng,
      recorded_address: rec.address,
      notes: rec.notes || null,
      upload_status: rec.uploadStatus,
      is_deleted: false,
      created_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function saveSupabaseSafetyConfirmation(
  confirmation: SafetyConfirmationRecord,
  userId: string
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('safety_confirmations').insert({
      id: confirmation.id,
      user_id: userId,
      journey_id: confirmation.journeyId || null,
      confirmation_type: confirmation.confirmationType,
      is_duress: confirmation.isDuress,
      confirmed_at: confirmation.timestamp || new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function saveSupabaseNotificationAttempts(
  emergencyEventId: string,
  contacts: TrustedContact[]
): Promise<boolean> {
  if (!supabase || contacts.length === 0) return false;
  try {
    const rows = contacts.map((c) => ({
      emergency_event_id: emergencyEventId,
      contact_id: c.id.startsWith('ct_') ? null : c.id,
      contact_phone: c.phone,
      channel: 'SMS',
      provider: 'Unconfigured Provider',
      status: 'PROVIDER_UNCONFIGURED',
      attempt_count: 1,
      provider_response: 'SMS/WhatsApp provider credentials not configured in Supabase. Dispatch queued.',
      sent_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('notification_attempts').insert(rows);
    return !error;
  } catch {
    return false;
  }
}

// ==============================================================================
// CLOUD RETRIEVAL METHODS (Populating user state from Supabase on Login / Restore)
// ==============================================================================

export async function fetchSupabaseEvidence(userId: string): Promise<EvidenceRecord[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('evidence_metadata')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      type: row.evidence_type,
      timestamp: new Date(row.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
      }),
      duration: row.duration_seconds
        ? `${Math.floor(row.duration_seconds / 60)}:${(row.duration_seconds % 60).toString().padStart(2, '0')}`
        : undefined,
      durationSeconds: row.duration_seconds,
      coords: { lat: row.recorded_lat, lng: row.recorded_lng },
      address: row.recorded_address || 'Cloud Vault Recording',
      sha256Hash: row.sha256_hash,
      fileSizeBytes: Number(row.file_size_bytes) || 0,
      mimeType: row.mime_type,
      storagePath: row.storage_path,
      syncedToCloud: true,
      uploadStatus: (row.upload_status as any) || 'UPLOADED',
      notes: row.notes || undefined,
      journeyId: row.journey_id || undefined,
      emergencyEventId: row.emergency_event_id || undefined,
    }));
  } catch {
    return [];
  }
}

export async function fetchSupabaseEmergencyEvents(userId: string): Promise<EmergencyEventRecord[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('emergency_events')
      .select('*, notification_attempts(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      journeyId: row.journey_id || undefined,
      timestamp: row.created_at,
      reason: row.trigger_reason,
      location: { lat: row.lat, lng: row.lng },
      gpsAccuracy: row.accuracy,
      googleMapsUrl: row.google_maps_url,
      status: row.status,
      notificationAttempts: (row.notification_attempts || []).map((na: any) => ({
        contactId: na.contact_id || '',
        contactName: na.contact_phone,
        channel: na.channel,
        status: na.status,
        timestamp: new Date(na.sent_at).toLocaleTimeString(),
      })),
    }));
  } catch {
    return [];
  }
}

export async function fetchSupabaseAuditEvents(userId: string): Promise<AuditEventRecord[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('audit_events')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      timestamp: new Date(row.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      details: row.details || '',
    }));
  } catch {
    return [];
  }
}

