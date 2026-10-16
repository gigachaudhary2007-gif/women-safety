import { TrustedContact, SafePlace, SafetyTip, UserProfile, JourneySettings } from '../types';

export const DEFAULT_USER: UserProfile = {
  id: 'usr_safe_01',
  name: 'Aanya Sharma',
  email: 'aanya.sharma@safejourney.app',
  phone: '+1 (555) 392-8190',
  bloodGroup: 'B+',
  emergencyNote: 'Asthma inhaler in tote bag. Emergency contact: Sister (Priya).',
  pin: '1234',
  duressPin: '9999',
  onboardingCompleted: true,
  isLoggedIn: true,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

export const DEFAULT_SETTINGS: JourneySettings = {
  deviationThresholdMeters: 500, // Trigger if deviation > 500m
  stopTimeoutSeconds: 300, // Trigger if unexplained stop > 5 mins (300s)
  countdownSeconds: 30, // 30-second countdown
  gpsCheckIntervalSeconds: 8, // GPS polling frequency 5-10s
  consecutiveDeviationsRequired: 3, // Require multiple readings before confirming deviation
  maxAcceptableGpsAccuracyMeters: 50, // Ignore GPS jitter > 50m
  autoCameraRecordOnAlert: true, // Camera video + audio evidence
  autoAudioRecordOnAlert: true,
  shareLiveLocation: true,
  voicePhrase: 'SafeJourney, Help',
  voiceTriggerEnabled: false,
};

export const DEFAULT_CONTACTS: TrustedContact[] = [
  {
    id: 'ct_01',
    name: 'Priya Sharma',
    phone: '+1 (555) 843-2011',
    relationship: 'Sibling',
    isPrimary: true,
    notifyOnJourneyStart: true,
    notifyOnDeviation: true,
    notifyOnSos: true,
  },
  {
    id: 'ct_02',
    name: 'Rohan Verma',
    phone: '+1 (555) 912-4402',
    relationship: 'Partner',
    isPrimary: false,
    notifyOnJourneyStart: true,
    notifyOnDeviation: true,
    notifyOnSos: true,
  },
  {
    id: 'ct_03',
    name: 'Maya Patel',
    phone: '+1 (555) 604-1289',
    relationship: 'Friend',
    isPrimary: false,
    notifyOnJourneyStart: false,
    notifyOnDeviation: true,
    notifyOnSos: true,
  },
];

export const NEARBY_SAFE_PLACES: SafePlace[] = [
  {
    id: 'plc_01',
    name: 'Central Police Station & Women Help Desk',
    type: 'police',
    distance: '0.4 km',
    address: '42 Civic Center Blvd, Suite 101',
    phone: '112',
    lat: 28.6145,
    lng: 77.2095,
    isOpen24x7: true,
  },
  {
    id: 'plc_02',
    name: 'St. Jude Memorial Hospital Emergency',
    type: 'hospital',
    distance: '0.9 km',
    address: '88 Healthcare Avenue, East Wing',
    phone: '+1 (555) 900-1122',
    lat: 28.6180,
    lng: 77.2150,
    isOpen24x7: true,
  },
  {
    id: 'plc_03',
    name: 'Apollo 24/7 Wellness & Care Pharmacy',
    type: 'pharmacy',
    distance: '0.3 km',
    address: '15 Market Crescent Lane',
    phone: '+1 (555) 332-9900',
    lat: 28.6120,
    lng: 77.2060,
    isOpen24x7: true,
  },
  {
    id: 'plc_04',
    name: 'Metro Transit Security Kiosk (Platform A)',
    type: 'safe_spot',
    distance: '0.2 km',
    address: 'Grand Central Metro Gate 3',
    phone: '1091',
    lat: 28.6135,
    lng: 77.2105,
    isOpen24x7: true,
  },
];

export const HELPLINE_SHORTCUTS = [
  {
    number: '112',
    label: 'National Emergency',
    description: 'Police, Fire, Ambulance (All-in-one)',
    icon: 'ShieldAlert',
  },
  {
    number: '1091',
    label: 'Women Helpline',
    description: 'Dedicated 24/7 Women Police Response',
    icon: 'HeartHandshake',
  },
  {
    number: '181',
    label: 'Women in Distress',
    description: 'Domestic & transit emergency support',
    icon: 'PhoneCall',
  },
];

export const SAFETY_TIPS: SafetyTip[] = [
  {
    id: 'tip_01',
    category: 'Cab Safety',
    title: 'Verify Cab Details Before Boarding',
    summary: 'Match vehicle license plate, driver photo, and initiate SafeJourney Journey Guard before departing.',
    detail: 'Never enter an unverified vehicle. Before stepping in, ask the driver who they are picking up rather than giving your name. Turn on Journey Guard to automatically monitor stops.',
    readTime: '2 min read',
    imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'tip_02',
    category: 'Night Travel',
    title: 'The "Two-Anchor" Walk Principle',
    summary: 'Stay on illuminated high-visibility corridors with open commercial anchors like 24/7 stores or transit hubs.',
    detail: 'When walking at night, avoid dark shortcuts or alleyways even if GPS shows a 2-minute shortcut. Keep your hands free, phone accessible in your pocket or hand, and volume at a level where ambient sounds remain audible.',
    readTime: '3 min read',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'tip_03',
    category: 'Digital Privacy',
    title: 'How Journey Guard Protects Your Location',
    summary: 'SafeJourney only transmits your coordinates during active trips or emergency SOS escalation.',
    detail: 'Your location is never shared without explicit consent. When you complete a journey, live location broadcasting stops immediately. Your coordinates are encrypted with zero advertising telemetry.',
    readTime: '2 min read',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
  },
];
