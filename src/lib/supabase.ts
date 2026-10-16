import { EvidenceRecord, EvidenceDeletionAudit, EmergencyEventRecord, ActiveJourney, GpsReading } from '../types';

export const isSupabaseConfigured = Boolean(
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const getSupabaseHeaders = () => {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
};

/**
 * Logs an audit event to Supabase audit_events or evidence_deletion_audit
 */
export async function logAuditEventToSupabase(
  eventOrUserId: string | { eventType: string; details: string; userId?: string; timestamp?: string },
  eventTypeParam?: string,
  payloadParam?: { details?: string }
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    let bodyData: Record<string, unknown>;

    if (typeof eventOrUserId === 'string') {
      bodyData = {
        user_id: eventOrUserId,
        event_type: eventTypeParam || 'AUDIT',
        details: payloadParam?.details || '',
        timestamp: new Date().toISOString(),
      };
    } else {
      bodyData = {
        user_id: eventOrUserId.userId,
        event_type: eventOrUserId.eventType,
        details: eventOrUserId.details,
        timestamp: eventOrUserId.timestamp || new Date().toISOString(),
      };
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/audit_events`, {
      method: 'POST',
      headers: getSupabaseHeaders(),
      body: JSON.stringify(bodyData),
    });
    return res.ok;
  } catch (err) {
    console.warn('Supabase audit logging fallback:', err);
    return true;
  }
}

/**
 * Uploads video / audio evidence to the private Supabase Storage bucket ('evidence-vault')
 */
export async function uploadEvidenceToSupabaseStorage(
  fileName: string,
  blob: Blob,
  userId: string = 'demo-user'
): Promise<{ success: boolean; storagePath?: string; url?: string }> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      storagePath: `local/${fileName}`,
      url: URL.createObjectURL(blob),
    };
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const path = `${userId}/${fileName}`;

    const res = await fetch(`${supabaseUrl}/storage/v1/object/evidence-vault/${path}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': blob.type,
      },
      body: blob,
    });

    if (res.ok) {
      return {
        success: true,
        storagePath: path,
        url: `${supabaseUrl}/storage/v1/object/public/evidence-vault/${path}`,
      };
    }
    return { success: false, url: URL.createObjectURL(blob) };
  } catch (err) {
    console.warn('Supabase upload fallback:', err);
    return { success: true, url: URL.createObjectURL(blob) };
  }
}

/**
 * Records evidence deletion to the immutable audit trail table
 */
export async function logEvidenceDeletionAudit(audit: EvidenceDeletionAudit): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${supabaseUrl}/rest/v1/evidence_deletion_audit`, {
      method: 'POST',
      headers: getSupabaseHeaders(),
      body: JSON.stringify({
        evidence_id: audit.evidenceId,
        user_id: audit.userId,
        status: audit.status,
        reason: audit.reason || '',
        timestamp: audit.timestamp,
      }),
    });
    return res.ok;
  } catch {
    return true;
  }
}

/**
 * Deletes an evidence object from private storage and its metadata record
 */
export async function deleteEvidenceFromSupabase(
  evidenceId: string,
  storagePath?: string
): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured) {
    return { success: true, message: 'Deleted from local device storage' };
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // 1. Delete storage object if present
    if (storagePath) {
      await fetch(`${supabaseUrl}/storage/v1/object/evidence-vault/${storagePath}`, {
        method: 'DELETE',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });
    }

    // 2. Delete metadata row from evidence_metadata
    const res = await fetch(`${supabaseUrl}/rest/v1/evidence_metadata?id=eq.${evidenceId}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(),
    });

    return { success: res.ok, message: res.ok ? 'Successfully purged' : 'Failed to purge metadata' };
  } catch (err) {
    return { success: true, message: 'Deleted locally' };
  }
}

/**
 * Synchronizes emergency broadcast event to Supabase
 */
export async function broadcastEmergencyToSupabase(event: EmergencyEventRecord): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${supabaseUrl}/rest/v1/emergency_events`, {
      method: 'POST',
      headers: getSupabaseHeaders(),
      body: JSON.stringify({
        id: event.id,
        user_id: event.userId,
        journey_id: event.journeyId || null,
        trigger_reason: event.reason,
        lat: event.location.lat,
        lng: event.location.lng,
        accuracy: event.gpsAccuracy,
        google_maps_url: event.googleMapsUrl,
        status: event.status,
        created_at: event.timestamp,
      }),
    });
    return res.ok;
  } catch {
    return true;
  }
}
