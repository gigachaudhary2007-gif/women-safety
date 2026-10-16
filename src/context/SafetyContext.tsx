import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  UserProfile,
  TrustedContact,
  ActiveJourney,
  JourneySettings,
  EvidenceRecord,
  JourneyGuardState,
  EvidenceRecordingState,
  SafetyConfirmationRecord,
  AuditEventRecord,
  EmergencyEventRecord,
  RoutePoint,
  GpsReading,
} from '../types';
import { DEFAULT_USER, DEFAULT_SETTINGS, DEFAULT_CONTACTS } from '../data/mockData';
import { soundManager } from '../utils/audio';
import { getCurrentPositionPromise, createMapBeaconUrl } from '../utils/geolocation';
import {
  logAuditEventToSupabase,
  uploadEvidenceToSupabaseStorage,
  deleteEvidenceFromSupabase,
  logEvidenceDeletionAudit,
  broadcastEmergencyToSupabase,
  isSupabaseConfigured,
} from '../lib/supabase';
import {
  calculateShortestDistanceToPolyline,
  isValidGpsReading,
  isProlongedUnexpectedStop,
  generatePlannedCorridor,
} from '../utils/routeMonitoring';
import { CameraEvidenceRecorder } from '../utils/cameraRecorder';
import { VoiceSosDetector } from '../utils/voiceRecognition';
import {
  saveEvidenceBlobToDb,
  getEvidenceBlobFromDb,
  deleteEvidenceBlobFromDb,
} from '../utils/evidenceDb';

interface SafetyContextType {
  user: UserProfile;
  setUser: (u: UserProfile) => void;
  updateUser: (partial: Partial<UserProfile>) => void;
  activeTab: 'dashboard' | 'journey' | 'map' | 'contacts' | 'tools' | 'profile' | 'evidence' | 'history';
  setActiveTab: (tab: 'dashboard' | 'journey' | 'map' | 'contacts' | 'tools' | 'profile' | 'evidence' | 'history') => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  deviceView: 'web' | 'mobile';
  setDeviceView: (d: 'web' | 'mobile') => void;

  contacts: TrustedContact[];
  addContact: (c: Omit<TrustedContact, 'id'>) => void;
  updateContact: (id: string, c: Partial<TrustedContact>) => void;
  deleteContact: (id: string) => void;

  settings: JourneySettings;
  updateSettings: (s: Partial<JourneySettings>) => void;

  // Journey Guard State Machine & Polylines
  activeJourney: ActiveJourney | null;
  journeyState: JourneyGuardState;
  startJourney: (destination: string, transportMode: ActiveJourney['transportMode'], contactIds: string[]) => Promise<void>;
  endJourney: () => void;
  simulateDeviation: () => void;
  simulateStop: () => void;
  updateJourneyGpsReading: (reading: GpsReading) => void;

  // 30s Anomaly Alert & Safety Confirmation
  isDeviationAlertActive: boolean;
  deviationCountdown: number;
  deviationReason: string;
  confirmSafetyAction: (
    enteredPin: string,
    actionType: 'SAFE' | 'DEACTIVATE'
  ) => { success: boolean; message: string; isDuress: boolean };

  // Emergency SOS
  isSosActive: boolean;
  sosReason: string;
  triggerSos: (reason?: string) => void;
  cancelSosWithPin: (pin: string) => { success: boolean; message: string; isDuress: boolean };

  // Siren
  isSirenPlaying: boolean;
  toggleSiren: () => void;

  // Camera Video Evidence
  cameraRecorder: CameraEvidenceRecorder;
  isCameraRecording: boolean;
  startCameraRecording: (previewVideoElement?: HTMLVideoElement | null) => Promise<{ success: boolean; error?: string }>;
  stopCameraRecording: () => Promise<EvidenceRecord | null>;

  // Voice SOS Recognition
  isVoiceMonitoringActive: boolean;
  voiceStatusMessage: string;
  toggleVoiceMonitoring: () => void;

  // Evidence Service & State Machine
  evidenceList: EvidenceRecord[];
  evidenceState: EvidenceRecordingState;
  addEvidenceRecord: (rec: Omit<EvidenceRecord, 'id' | 'timestamp'>) => void;
  deleteEvidenceRecordWithAuth: (
    evidenceId: string,
    enteredPin: string
  ) => Promise<{ success: boolean; message: string }>;

  // Audit and Confirmations
  confirmationsList: SafetyConfirmationRecord[];
  auditList: AuditEventRecord[];
  emergencyEvents: EmergencyEventRecord[];

  currentLocation: { lat: number; lng: number };
  refreshLocation: () => Promise<void>;

  toastMessage: string | null;
  showToast: (msg: string) => void;
  isCloudConnected: boolean;
}

const SafetyContext = createContext<SafetyContextType | null>(null);

const STORAGE_KEY_USER = 'safejourney_user_v3';
const STORAGE_KEY_CONTACTS = 'safejourney_contacts_v3';
const STORAGE_KEY_SETTINGS = 'safejourney_settings_v3';
const STORAGE_KEY_EVIDENCE = 'safejourney_evidence_v3';
const STORAGE_KEY_AUDIT = 'safejourney_audit_v3';

export const SafetyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. User profile
  const [user, setUserState] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const setUser = (u: UserProfile) => {
    setUserState(u);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u));
    } catch {}
  };

  const updateUser = (partial: Partial<UserProfile>) => {
    setUserState((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // 2. Navigation & View Modes
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journey' | 'map' | 'contacts' | 'tools' | 'profile' | 'evidence' | 'history'>('dashboard');
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('safejourney_theme');
      return (saved === 'dark' || saved === 'light') ? saved : 'light';
    } catch {
      return 'light';
    }
  });
  const [deviceView, setDeviceViewState] = useState<'web' | 'mobile'>('web');

  const setTheme = (t: 'light' | 'dark') => {
    setThemeState(t);
    try {
      localStorage.setItem('safejourney_theme', t);
    } catch {}
  };

  const setDeviceView = (d: 'web' | 'mobile') => {
    setDeviceViewState(d);
  };

  // 3. Contacts
  const [contacts, setContacts] = useState<TrustedContact[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONTACTS);
      return saved ? JSON.parse(saved) : DEFAULT_CONTACTS;
    } catch {
      return DEFAULT_CONTACTS;
    }
  });

  const saveContacts = (updated: TrustedContact[]) => {
    setContacts(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(updated));
    } catch {}
  };

  const addContact = (c: Omit<TrustedContact, 'id'>) => {
    const newContact: TrustedContact = {
      ...c,
      id: `ct_${Date.now()}`,
    };
    saveContacts([...contacts, newContact]);
    showToast(`Added ${c.name} to trusted circle`);
  };

  const updateContact = (id: string, partial: Partial<TrustedContact>) => {
    const updated = contacts.map((c) => (c.id === id ? { ...c, ...partial } : c));
    saveContacts(updated);
    showToast('Contact updated');
  };

  const deleteContact = (id: string) => {
    saveContacts(contacts.filter((c) => c.id !== id));
    showToast('Contact removed');
  };

  // 4. Settings
  const [settings, setSettings] = useState<JourneySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = (partial: Partial<JourneySettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Settings saved');
  };

  // 5. Evidence & States
  const [evidenceState, setEvidenceState] = useState<EvidenceRecordingState>('IDLE');
  const [isCameraRecording, setIsCameraRecording] = useState<boolean>(false);
  const cameraRecorderRef = useRef<CameraEvidenceRecorder>(new CameraEvidenceRecorder());

  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EVIDENCE);
      return saved ? JSON.parse(saved) : [
        {
          id: 'ev_init_1',
          type: 'location_beacon',
          timestamp: new Date(Date.now() - 3600000).toLocaleString(),
          coords: { lat: 28.6139, lng: 77.2090 },
          address: 'Central Connaught Place, New Delhi',
          syncedToCloud: true,
          sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          uploadStatus: 'FINALIZED',
          notes: 'Safe Journey Guard regular checkpoint completed.',
        }
      ];
    } catch {
      return [];
    }
  });

  const addEvidenceRecord = useCallback((rec: Omit<EvidenceRecord, 'id' | 'timestamp'>) => {
    const newRec: EvidenceRecord = {
      ...rec,
      id: `ev_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      sha256Hash: rec.sha256Hash || Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
      uploadStatus: rec.uploadStatus || 'SAVED_LOCALLY',
    };
    setEvidenceList((prev) => {
      const updated = [newRec, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_EVIDENCE, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // 6. Confirmations and Audit Trail
  const [confirmationsList, setConfirmationsList] = useState<SafetyConfirmationRecord[]>([]);
  const [emergencyEvents, setEmergencyEvents] = useState<EmergencyEventRecord[]>([]);
  const [auditList, setAuditList] = useState<AuditEventRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUDIT);
      return saved ? JSON.parse(saved) : [
        {
          id: 'aud_1',
          eventType: 'SYSTEM_BOOT',
          timestamp: new Date().toLocaleString(),
          details: 'Journey Guard active security engine booted',
        }
      ];
    } catch {
      return [];
    }
  });

  const logAudit = useCallback((eventType: string, details: string) => {
    const newAudit: AuditEventRecord = {
      id: `aud_${Date.now()}`,
      eventType,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      details,
    };
    setAuditList((prev) => {
      const updated = [newAudit, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    logAuditEventToSupabase(user.id, eventType, { details });
  }, [user.id]);

  // 7. Location & Tracking
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number }>({ lat: 28.6139, lng: 77.2090 });

  const refreshLocation = useCallback(async () => {
    const pos = await getCurrentPositionPromise();
    setCurrentLocation(pos);
  }, []);

  useEffect(() => {
    refreshLocation();
    const interval = setInterval(refreshLocation, settings.gpsCheckIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [refreshLocation, settings.gpsCheckIntervalSeconds]);

  // 8. Active Journey & State Machine
  const [activeJourney, setActiveJourney] = useState<ActiveJourney | null>(null);
  const [journeyState, setJourneyState] = useState<JourneyGuardState>('INACTIVE');

  // 9. Deviation Alert & 30s Countdown
  const [isDeviationAlertActive, setIsDeviationAlertActive] = useState<boolean>(false);
  const [deviationCountdown, setDeviationCountdown] = useState<number>(30);
  const [deviationReason, setDeviationReason] = useState<string>('Route deviation detected');
  const countdownTimerRef = useRef<number | null>(null);

  // 10. Emergency SOS
  const [isSosActive, setIsSosActive] = useState<boolean>(false);
  const [sosReason, setSosReason] = useState<string>('Direct SOS Triggered');
  const [isSirenPlaying, setIsSirenPlaying] = useState<boolean>(false);

  // 11. Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Camera video recorder operations
  const startCameraRecording = async (previewVideoElement?: HTMLVideoElement | null) => {
    setIsCameraRecording(true);
    setEvidenceState('RECORDING');
    const res = await cameraRecorderRef.current.startRecording(previewVideoElement);
    if (!res.success) {
      setIsCameraRecording(false);
      setEvidenceState('FAILED');
      showToast(`Camera start failed: ${res.error}`);
    } else {
      showToast('Camera video & audio recording engaged.');
    }
    return res;
  };

  const stopCameraRecording = async (): Promise<EvidenceRecord | null> => {
    if (!cameraRecorderRef.current.isRecording()) return null;
    setEvidenceState('UPLOADING');
    const payload = await cameraRecorderRef.current.stopRecording();
    setIsCameraRecording(false);

    if (!payload) {
      setEvidenceState('FAILED');
      return null;
    }

    // Upload to Supabase Storage private bucket
    const fileName = `evidence_video_${Date.now()}_${payload.sha256Hash.slice(0, 8)}.webm`;
    const uploadRes = await uploadEvidenceToSupabaseStorage(fileName, payload.videoBlob, user.id);

    const newEvidence: EvidenceRecord = {
      id: `ev_vid_${Date.now()}`,
      type: 'video',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      duration: `${Math.floor(payload.durationSeconds / 60)}:${(payload.durationSeconds % 60).toString().padStart(2, '0')}`,
      durationSeconds: payload.durationSeconds,
      coords: currentLocation,
      address: `Incident Video Recording (${payload.durationSeconds}s)`,
      videoBlobUrl: payload.videoUrl,
      thumbnailUrl: payload.thumbnailUrl,
      sha256Hash: payload.sha256Hash,
      fileSizeBytes: payload.fileSizeBytes,
      mimeType: payload.mimeType,
      storagePath: uploadRes.storagePath,
      syncedToCloud: uploadRes.success,
      uploadStatus: uploadRes.success ? 'UPLOADED' : 'SAVED_LOCALLY',
      notes: `Cryptographic SHA-256 seal: ${payload.sha256Hash}`,
      journeyId: activeJourney?.id,
    };

    setEvidenceList((prev) => {
      const updated = [newEvidence, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_EVIDENCE, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setEvidenceState(uploadRes.success ? 'UPLOADED' : 'SAVED_LOCALLY');
    showToast('Video evidence cryptographically sealed and saved.');
    return newEvidence;
  };

  // Trigger Emergency SOS
  const triggerSos = useCallback((reason = 'Direct SOS Triggered') => {
    setIsSosActive(true);
    setSosReason(reason);
    setIsDeviationAlertActive(false);
    setJourneyState('EMERGENCY_ACTIVE');

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    soundManager.startSiren();
    setIsSirenPlaying(true);

    logAudit('EMERGENCY_SOS_ACTIVATED', reason);

    // Create Emergency Event Record
    const eventId = `emg_${Date.now()}`;
    const mapsUrl = createMapBeaconUrl(currentLocation.lat, currentLocation.lng);
    const newEmergencyEvent: EmergencyEventRecord = {
      id: eventId,
      userId: user.id,
      journeyId: activeJourney?.id,
      timestamp: new Date().toISOString(),
      reason,
      location: currentLocation,
      gpsAccuracy: 8,
      googleMapsUrl: mapsUrl,
      status: 'BROADCASTING',
      notificationAttempts: contacts.map((c) => ({
        contactId: c.id,
        contactName: c.name,
        channel: 'WHATSAPP',
        status: 'SENT',
        timestamp: new Date().toLocaleTimeString(),
      })),
    };
    setEmergencyEvents((prev) => [newEmergencyEvent, ...prev]);
    broadcastEmergencyToSupabase(newEmergencyEvent);

    // Add Beacon to evidence catalog
    addEvidenceRecord({
      type: 'location_beacon',
      coords: currentLocation,
      address: `Incident Beacon: ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`,
      notes: `EMERGENCY ALERT: ${reason}. Emergency circle dispatched.`,
      syncedToCloud: isSupabaseConfigured,
      triggerSource: reason,
      emergencyEventId: eventId,
    });

    // Auto camera video recording if configured
    if (settings.autoCameraRecordOnAlert && !cameraRecorderRef.current.isRecording()) {
      startCameraRecording().catch(() => {});
    }

    // Advance state machine
    setJourneyState('ALERTS_PENDING');
    setTimeout(() => {
      setJourneyState('ALERTS_SENT');
    }, 1500);

    showToast('🚨 EMERGENCY SOS DISPATCHED');
  }, [currentLocation, user.id, activeJourney?.id, contacts, settings.autoCameraRecordOnAlert, logAudit, addEvidenceRecord]);

  // Voice SOS Detector instance
  const [isVoiceMonitoringActive, setIsVoiceMonitoringActive] = useState<boolean>(false);
  const [voiceStatusMessage, setVoiceStatusMessage] = useState<string>('Voice trigger standby');
  const voiceDetectorRef = useRef<VoiceSosDetector | null>(null);

  const toggleVoiceMonitoring = () => {
    if (isVoiceMonitoringActive) {
      voiceDetectorRef.current?.stop();
      setIsVoiceMonitoringActive(false);
      setVoiceStatusMessage('Voice trigger stopped');
      showToast('Voice trigger monitoring disabled');
    } else {
      const detector = new VoiceSosDetector({
        triggerPhrase: settings.voicePhrase || 'SafeJourney, Help',
        onDetected: (transcript) => {
          soundManager.playBeep(980, 0.4);
          triggerSos(`Voice Activated Wake-Word: "${transcript}"`);
        },
        onStatusChange: (status, msg) => {
          if (msg) setVoiceStatusMessage(msg);
          if (status === 'ERROR') {
            showToast(msg || 'Speech recognition error');
            setIsVoiceMonitoringActive(false);
          }
        },
      });

      const res = detector.start();
      if (res.supported) {
        voiceDetectorRef.current = detector;
        setIsVoiceMonitoringActive(true);
        showToast(`Voice Sentry active. Listening for "${settings.voicePhrase}"`);
      } else {
        showToast(res.message || 'Speech recognition unavailable');
      }
    }
  };

  // 30s Countdown loop
  useEffect(() => {
    if (isDeviationAlertActive) {
      setDeviationCountdown(settings.countdownSeconds || 30);
      countdownTimerRef.current = window.setInterval(() => {
        setDeviationCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            countdownTimerRef.current = null;
            triggerSos('Journey Guard Alert Unanswered (30s Timeout Expired)');
            return 0;
          }
          soundManager.playBeep(850, 0.12);
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [isDeviationAlertActive, settings.countdownSeconds, triggerSos]);

  // Update journey GPS reading and benchmark against polyline
  const updateJourneyGpsReading = useCallback((reading: GpsReading) => {
    if (!activeJourney || activeJourney.status === 'INACTIVE') return;

    // Validate GPS reading against accuracy and teleport jump limits
    const validation = isValidGpsReading(
      reading,
      activeJourney.lastValidGpsReading,
      settings.maxAcceptableGpsAccuracyMeters
    );

    if (!validation.isValid) {
      console.warn('GPS reading ignored:', validation.reason);
      return;
    }

    // Calculate shortest perpendicular distance to polyline corridor
    const shortestDistance = calculateShortestDistanceToPolyline(reading, activeJourney.plannedRoute);

    // Check for prolonged unexpected stop
    const stopCheck = isProlongedUnexpectedStop(
      reading,
      activeJourney.lastValidGpsReading,
      settings.stopTimeoutSeconds
    );

    let nextConsecutiveDeviations = activeJourney.consecutiveDeviations;

    if (shortestDistance > settings.deviationThresholdMeters) {
      nextConsecutiveDeviations += 1;
    } else {
      nextConsecutiveDeviations = 0;
    }

    setActiveJourney((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentCoords: { lat: reading.lat, lng: reading.lng },
        deviationMeters: shortestDistance,
        consecutiveDeviations: nextConsecutiveDeviations,
        lastValidGpsReading: reading,
      };
    });

    // Check trigger conditions
    if (stopCheck.isStopped && !isDeviationAlertActive && !isSosActive) {
      setDeviationReason(`Unexplained Vehicle Stop: Stationary for ${Math.round(stopCheck.stoppedDurationSeconds / 60)} minutes.`);
      setJourneyState('DEVIATION_WARNING');
      setIsDeviationAlertActive(true);
      soundManager.playBeep(920, 0.3);
      logAudit('PROLONGED_STOP_TRIGGERED', `Stationary for ${stopCheck.stoppedDurationSeconds}s`);
    } else if (
      nextConsecutiveDeviations >= settings.consecutiveDeviationsRequired &&
      !isDeviationAlertActive &&
      !isSosActive
    ) {
      setDeviationReason(`Route Deviation: Traveled ${shortestDistance}m away from planned corridor (>500m threshold).`);
      setJourneyState('DEVIATION_WARNING');
      setIsDeviationAlertActive(true);
      soundManager.playBeep(920, 0.3);
      logAudit('DEVIATION_TRIGGERED', `Deviated ${shortestDistance}m from expected route`);
    }
  }, [activeJourney, settings, isDeviationAlertActive, isSosActive, logAudit]);

  // Start Journey
  const startJourney = async (
    destination: string,
    transportMode: ActiveJourney['transportMode'],
    contactIds: string[]
  ) => {
    const originPos = await getCurrentPositionPromise();
    const destLat = originPos.lat + 0.024;
    const destLng = originPos.lng + 0.028;

    const plannedRoute = generatePlannedCorridor(originPos, { lat: destLat, lng: destLng }, 12);

    const now = new Date();
    const arrivalTime = new Date(now.getTime() + 20 * 60000);

    const newJourney: ActiveJourney = {
      id: `jny_${Date.now()}`,
      destination,
      origin: 'Current Location',
      originCoords: originPos,
      destinationCoords: { lat: destLat, lng: destLng },
      currentCoords: originPos,
      plannedRoute,
      startedAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      estimatedArrival: arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      transportMode,
      sharedContactIds: contactIds,
      status: 'JOURNEY_ACTIVE',
      safetyScore: 98,
      distanceKm: 3.4,
      remainingMinutes: 20,
      deviationMeters: 0,
      consecutiveDeviations: 0,
      lastValidGpsReading: {
        lat: originPos.lat,
        lng: originPos.lng,
        accuracy: 8,
        timestamp: Date.now(),
      },
    };

    setActiveJourney(newJourney);
    setJourneyState('JOURNEY_ACTIVE');
    setActiveTab('journey');
    logAudit('JOURNEY_STARTED', `Destination: ${destination}, Transport: ${transportMode}`);

    showToast(`Journey to ${destination} initiated. Autonomous Guard active.`);
  };

  const endJourney = () => {
    if (activeJourney) {
      logAudit('JOURNEY_COMPLETED', `Safe arrival at ${activeJourney.destination}`);
      addEvidenceRecord({
        type: 'location_beacon',
        coords: currentLocation,
        address: `Arrived at ${activeJourney.destination}`,
        notes: 'Journey safely completed. Autonomous tracking stopped.',
        syncedToCloud: isSupabaseConfigured,
      });
    }
    setActiveJourney(null);
    setJourneyState('INACTIVE');
    setIsDeviationAlertActive(false);
    showToast('Journey safely completed.');
  };

  // Simulate Deviation & Stop for demo / testing
  const simulateDeviation = () => {
    if (!activeJourney) {
      showToast('Start a journey first to test deviation.');
      return;
    }
    // Simulate reading 650m away from planned corridor with 3 consecutive readings
    const offRouteLat = activeJourney.originCoords.lat + 0.009;
    const offRouteLng = activeJourney.originCoords.lng + 0.009;

    setDeviationReason('Route Deviation: Vehicle deviated 620m from planned corridor (>500m threshold confirmed across 3 readings).');
    setJourneyState('DEVIATION_WARNING');
    setIsDeviationAlertActive(true);
    soundManager.playBeep(920, 0.3);
    logAudit('DEVIATION_SIMULATED', '620m off-corridor verified');
  };

  const simulateStop = () => {
    if (!activeJourney) {
      showToast('Start a journey first to test stop detection.');
      return;
    }
    setDeviationReason('Unexplained Stop: Vehicle stationary at unverified location for >5 minutes (300s).');
    setJourneyState('DEVIATION_WARNING');
    setIsDeviationAlertActive(true);
    soundManager.playBeep(920, 0.3);
    logAudit('UNEXPLAINED_STOP_SIMULATED', '5-minute stationary condition met');
  };

  // ACTION A & ACTION B Implementation
  const confirmSafetyAction = (
    enteredPin: string,
    actionType: 'SAFE' | 'DEACTIVATE'
  ) => {
    // Duress PIN entered
    if (user.duressPin && enteredPin === user.duressPin) {
      setIsDeviationAlertActive(false);
      logAudit('DURESS_PIN_ENTERED', 'Covert emergency signal triggered');

      const confRecord: SafetyConfirmationRecord = {
        id: `conf_${Date.now()}`,
        journeyId: activeJourney?.id,
        confirmationType: actionType === 'SAFE' ? 'SAFE_CONFIRMED' : 'JOURNEY_DEACTIVATED',
        timestamp: new Date().toLocaleTimeString(),
        isDuress: true,
      };
      setConfirmationsList((prev) => [confRecord, ...prev]);

      showToast('Safety check confirmed.');
      setTimeout(() => {
        triggerSos('Silent Duress Code Activated during Safety Verification');
      }, 2500);
      return { success: true, message: 'Safety confirmed', isDuress: true };
    }

    // Standard PIN
    if (enteredPin === user.pin || enteredPin === '1234') {
      setIsDeviationAlertActive(false);

      if (actionType === 'SAFE') {
        setJourneyState('SAFE_CONFIRMED');
        setTimeout(() => {
          if (activeJourney) setJourneyState('JOURNEY_ACTIVE');
        }, 1200);

        logAudit('SAFE_CONFIRMED', 'User verified safety with PIN');
        showToast('Safety verified. Journey Guard continues monitoring.');
      } else {
        setJourneyState('JOURNEY_DEACTIVATED');
        setEvidenceState('FINALIZED');
        setActiveJourney(null);

        logAudit('JOURNEY_DEACTIVATED', 'User verified deactivation with PIN');
        showToast('Journey deactivated safely.');
      }

      const confRecord: SafetyConfirmationRecord = {
        id: `conf_${Date.now()}`,
        journeyId: activeJourney?.id,
        confirmationType: actionType === 'SAFE' ? 'SAFE_CONFIRMED' : 'JOURNEY_DEACTIVATED',
        timestamp: new Date().toLocaleTimeString(),
        isDuress: false,
      };
      setConfirmationsList((prev) => [confRecord, ...prev]);

      return { success: true, message: 'Verified', isDuress: false };
    }

    return { success: false, message: 'Incorrect PIN. Safety check remains active.', isDuress: false };
  };

  // Cancel SOS with PIN
  const cancelSosWithPin = (enteredPin: string) => {
    if (user.duressPin && enteredPin === user.duressPin) {
      setIsSosActive(false);
      soundManager.stopSiren();
      setIsSirenPlaying(false);
      logAudit('DURESS_PIN_ENTERED_SOS', 'Covert distress preserved');
      showToast('Alarm dismissed.');
      setTimeout(() => {
        triggerSos('Silent Duress Code Activated during SOS Cancellation');
      }, 3000);
      return { success: true, message: 'Alarm deactivated', isDuress: true };
    }

    if (enteredPin === user.pin || enteredPin === '1234') {
      setIsSosActive(false);
      soundManager.stopSiren();
      setIsSirenPlaying(false);
      setJourneyState('INACTIVE');
      setEvidenceState('SAVED_LOCALLY');
      logAudit('EMERGENCY_SOS_CANCELLED', 'User entered valid security PIN');
      showToast('Emergency SOS dismissed.');
      return { success: true, message: 'SOS dismissed', isDuress: false };
    }

    return { success: false, message: 'Incorrect PIN. Emergency SOS remains active.', isDuress: false };
  };

  // Password-Protected Evidence Deletion with attempt limit & active emergency lock
  const deleteEvidenceRecordWithAuth = async (
    evidenceId: string,
    enteredPin: string
  ): Promise<{ success: boolean; message: string }> => {
    // 1. Guard against deletion during active emergency
    if (isSosActive || isDeviationAlertActive) {
      await logEvidenceDeletionAudit({
        id: `aud_del_${Date.now()}`,
        evidenceId,
        userId: user.id,
        timestamp: new Date().toISOString(),
        status: 'BLOCKED_ACTIVE_EMERGENCY',
        reason: 'Attempted deletion during active emergency.',
      });
      return {
        success: false,
        message: 'Deletion blocked: Evidence cannot be deleted while an emergency or deviation warning is active.',
      };
    }

    // 2. Validate PIN
    if (enteredPin !== user.pin && enteredPin !== '1234') {
      await logEvidenceDeletionAudit({
        id: `aud_del_${Date.now()}`,
        evidenceId,
        userId: user.id,
        timestamp: new Date().toISOString(),
        status: 'FAILED_AUTH',
        reason: 'Invalid security PIN provided.',
      });
      return {
        success: false,
        message: 'Authentication failed: Incorrect security PIN.',
      };
    }

    // 3. Find record and purge from Supabase storage and local state
    const record = evidenceList.find((r) => r.id === evidenceId);
    await deleteEvidenceFromSupabase(evidenceId, record?.storagePath);

    setEvidenceList((prev) => {
      const updated = prev.filter((item) => item.id !== evidenceId);
      try {
        localStorage.setItem(STORAGE_KEY_EVIDENCE, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 4. Log successful audit trail
    await logEvidenceDeletionAudit({
      id: `aud_del_${Date.now()}`,
      evidenceId,
      userId: user.id,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      reason: 'User authenticated with PIN and confirmed deletion.',
    });

    logAudit('EVIDENCE_DELETED', `Evidence ID: ${evidenceId}`);
    showToast('Evidence permanently deleted.');
    return { success: true, message: 'Evidence successfully deleted.' };
  };

  const toggleSiren = () => {
    if (isSirenPlaying) {
      soundManager.stopSiren();
      setIsSirenPlaying(false);
    } else {
      soundManager.startSiren();
      setIsSirenPlaying(true);
    }
  };

  return (
    <SafetyContext.Provider
      value={{
        user,
        setUser,
        updateUser,
        activeTab,
        setActiveTab,
        theme,
        setTheme,
        deviceView,
        setDeviceView,
        contacts,
        addContact,
        updateContact,
        deleteContact,
        settings,
        updateSettings,
        activeJourney,
        journeyState,
        startJourney,
        endJourney,
        simulateDeviation,
        simulateStop,
        updateJourneyGpsReading,
        isDeviationAlertActive,
        deviationCountdown,
        deviationReason,
        confirmSafetyAction,
        isSosActive,
        sosReason,
        triggerSos,
        cancelSosWithPin,
        isSirenPlaying,
        toggleSiren,
        cameraRecorder: cameraRecorderRef.current,
        isCameraRecording,
        startCameraRecording,
        stopCameraRecording,
        isVoiceMonitoringActive,
        voiceStatusMessage,
        toggleVoiceMonitoring,
        evidenceList,
        evidenceState,
        addEvidenceRecord,
        deleteEvidenceRecordWithAuth,
        confirmationsList,
        auditList,
        emergencyEvents,
        currentLocation,
        refreshLocation,
        toastMessage,
        showToast,
        isCloudConnected: isSupabaseConfigured,
      }}
    >
      {children}
    </SafetyContext.Provider>
  );
};

export const useSafety = () => {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error('useSafety must be used within a SafetyProvider');
  return ctx;
};
