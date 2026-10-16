export type JourneyGuardState =
  | 'INACTIVE'
  | 'JOURNEY_ACTIVE'
  | 'DEVIATION_WARNING'
  | 'EMERGENCY_ACTIVE'
  | 'ALERTS_PENDING'
  | 'ALERTS_SENT'
  | 'SAFE_CONFIRMED'
  | 'JOURNEY_DEACTIVATED'
  | 'EVIDENCE_FINALIZED'
  | 'ERROR';

export type EvidenceRecordingState =
  | 'IDLE'
  | 'PREPARING'
  | 'RECORDING'
  | 'SAVED_LOCALLY'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'FAILED'
  | 'INTERRUPTED'
  | 'FINALIZED';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  bloodGroup?: string;
  emergencyNote?: string;
  pin: string; // Default '1234'
  duressPin?: string; // Optional covert duress PIN
  onboardingCompleted: boolean;
  isLoggedIn: boolean;
  avatarUrl?: string;
  theme?: 'light' | 'dark';
  deviceView?: 'web' | 'mobile';
}

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relationship: 'Parent' | 'Partner' | 'Sibling' | 'Friend' | 'Colleague' | 'Other';
  isPrimary: boolean;
  notifyOnJourneyStart: boolean;
  notifyOnDeviation: boolean;
  notifyOnSos: boolean;
  avatar?: string;
}

export interface SafePlace {
  id: string;
  name: string;
  type: 'police' | 'hospital' | 'pharmacy' | 'safe_spot';
  distance: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  isOpen24x7: boolean;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GpsReading extends Coordinates {
  accuracy: number; // in meters
  speed?: number | null; // in m/s
  altitude?: number | null;
  heading?: number | null;
  timestamp: number; // epoch ms
}

export interface RoutePoint extends Coordinates {
  order: number;
}

export interface ActiveJourney {
  id: string;
  destination: string;
  origin: string;
  destinationCoords: Coordinates;
  originCoords: Coordinates;
  currentCoords: Coordinates;
  plannedRoute: RoutePoint[];
  startedAt: string;
  estimatedArrival: string;
  transportMode: 'walk' | 'cab' | 'transit' | 'bike';
  sharedContactIds: string[];
  status: JourneyGuardState;
  safetyScore: number;
  distanceKm: number;
  remainingMinutes: number;
  deviationMeters: number;
  consecutiveDeviations: number;
  lastStopDetectedAt?: number; // epoch ms if stopped
  lastValidGpsReading?: GpsReading;
}

export interface JourneySettings {
  deviationThresholdMeters: number; // e.g. 500m
  stopTimeoutSeconds: number; // e.g. 300s (5 minutes)
  countdownSeconds: number; // 30s
  gpsCheckIntervalSeconds: number; // 5-10s
  consecutiveDeviationsRequired: number; // e.g. 3 readings before alert
  maxAcceptableGpsAccuracyMeters: number; // e.g. 50m
  autoCameraRecordOnAlert: boolean; // Camera video + audio
  autoAudioRecordOnAlert: boolean;
  shareLiveLocation: boolean;
  voicePhrase: string; // Default: 'SafeJourney, Help'
  voiceTriggerEnabled: boolean;
}

export interface EvidenceRecord {
  id: string;
  type: 'audio' | 'video' | 'location_beacon' | 'incident_report';
  timestamp: string;
  duration?: string;
  durationSeconds?: number;
  coords: Coordinates;
  address: string;
  audioBlobUrl?: string;
  videoBlobUrl?: string;
  thumbnailUrl?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  notes?: string;
  syncedToCloud: boolean;
  sha256Hash?: string;
  uploadStatus?: EvidenceRecordingState;
  triggerSource?: string;
  storagePath?: string;
  journeyId?: string;
  emergencyEventId?: string;
}

export interface EvidenceDeletionAudit {
  id: string;
  evidenceId: string;
  userId: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED_AUTH' | 'BLOCKED_ACTIVE_EMERGENCY';
  reason?: string;
}

export interface SafetyConfirmationRecord {
  id: string;
  journeyId?: string;
  confirmationType: 'SAFE_CONFIRMED' | 'JOURNEY_DEACTIVATED';
  timestamp: string;
  isDuress: boolean;
}

export interface AuditEventRecord {
  id: string;
  eventType: string;
  timestamp: string;
  details: string;
}

export interface EmergencyEventRecord {
  id: string;
  userId: string;
  journeyId?: string;
  timestamp: string;
  reason: string;
  location: Coordinates;
  gpsAccuracy: number;
  googleMapsUrl: string;
  status: 'BROADCASTING' | 'RESOLVED_SAFE' | 'DEACTIVATED';
  notificationAttempts: {
    contactId: string;
    contactName: string;
    channel: 'SMS' | 'WHATSAPP' | 'SYSTEM';
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'PROVIDER_UNCONFIGURED';
    timestamp: string;
  }[];
}

export interface SafetyTip {
  id: string;
  category: 'Night Travel' | 'Cab Safety' | 'Public Transit' | 'Digital Privacy';
  title: string;
  summary: string;
  detail: string;
  readTime: string;
  imageUrl: string;
}
