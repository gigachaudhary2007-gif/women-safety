import React, { useState } from 'react';
import {
  ChevronLeft,
  Phone,
  MessageSquare,
  Navigation,
  Compass,
  MapPin,
  Car,
  Footprints,
  Bus,
  Bike,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  Share2,
  Calendar,
  ChevronDown,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import { soundManager } from '../../utils/audio';
import { createWhatsAppDistressUrl } from '../../utils/geolocation';

const SCHEDULE_DAYS = [
  { day: 'Mon', num: 20 },
  { day: 'Tue', num: 21 },
  { day: 'Wed', num: 22 },
  { day: 'Thu', num: 23 },
  { day: 'Fri', num: 24 },
  { day: 'Sat', num: 25 },
];

const PRESET_DESTINATIONS = [
  { name: 'Home', address: '48 Maple Avenue, Sector 14', distance: '3.4 km', time: '14 min' },
  { name: 'Office Campus', address: 'Cyber City Tech Tower B', distance: '7.8 km', time: '28 min' },
  { name: 'University Campus', address: 'Gate 2, North University Road', distance: '5.1 km', time: '20 min' },
  { name: 'Central Metro Hub', address: 'Station Exit 4, Main Plaza', distance: '1.8 km', time: '8 min' },
];

export const JourneyScreen: React.FC = () => {
  const {
    activeJourney,
    startJourney,
    endJourney,
    simulateDeviation,
    simulateStop,
    contacts,
    currentLocation,
    settings,
    updateSettings,
    setActiveTab,
    user,
    showToast,
  } = useSafety();

  const [destinationInput, setDestinationInput] = useState<string>('Cyber City Campus Tower B');
  const [selectedTransportMode, setSelectedTransportMode] = useState<'walk' | 'cab' | 'transit' | 'bike'>('cab');
  const [selectedDayNum, setSelectedDayNum] = useState<number>(21);
  const [showFullDetails, setShowFullDetails] = useState<boolean>(false);
  const [showThresholdConfig, setShowThresholdConfig] = useState<boolean>(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(
    contacts.map((c) => c.id)
  );

  const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];

  const handleStart = async () => {
    if (!destinationInput.trim()) {
      showToast('Please specify a destination');
      return;
    }
    soundManager.triggerHaptic(30);
    await startJourney(destinationInput, selectedTransportMode, selectedContactIds);
  };

  const handleCallEscort = () => {
    if (primaryContact) {
      window.location.href = `tel:${primaryContact.phone}`;
    }
  };

  const handleWhatsAppEscort = () => {
    if (primaryContact) {
      const url = createWhatsAppDistressUrl(
        primaryContact.phone,
        user.name,
        currentLocation.lat,
        currentLocation.lng,
        'Live Route Escort'
      );
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="h-10 px-4 rounded-2xl glass-panel flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs border border-slate-200 dark:border-indigo-900/40 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-indigo-600" />
          <span>Dashboard</span>
        </button>

        <h1 className="text-base lg:text-lg font-black text-slate-900 dark:text-white tracking-tight">
          {activeJourney ? 'Journey Guard Autonomous Monitor' : 'Journey Setup & Route Escort'}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={handleWhatsAppEscort}
            className="w-10 h-10 rounded-2xl glass-panel flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs border border-slate-200 dark:border-indigo-900/40 cursor-pointer"
            title="Message Primary Contact"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={handleCallEscort}
            className="w-10 h-10 rounded-2xl glass-panel flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs border border-slate-200 dark:border-indigo-900/40 cursor-pointer"
            title="Call Primary Contact"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Responsive 12-Column Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ================= LEFT COLUMN (col-span-12 lg:col-span-7) ================= */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Detail Card */}
          <div className="glass-panel rounded-[32px] p-6 lg:p-7 shadow-sm border border-slate-200 dark:border-indigo-900/50 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-black mb-3 border border-amber-500/40">
                  <span className="text-amber-500">★</span>
                  <span>4.9 Verified Safety Corridor</span>
                </div>

                {activeJourney ? (
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {activeJourney.destination}
                  </h2>
                ) : (
                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                      Target Destination
                    </label>
                    <input
                      type="text"
                      value={destinationInput}
                      onChange={(e) => setDestinationInput(e.target.value)}
                      className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-indigo-900/60 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="mt-3 flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>3.4 km route</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Est. 18 min</span>
                  </span>
                </div>
              </div>

              {/* Verified Escort Badge */}
              <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-3xl overflow-hidden glass-panel border border-slate-200 dark:border-indigo-900/40 shrink-0 shadow-sm relative">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80"
                  alt="Safe Escort"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute bottom-1.5 right-1.5 w-3 h-3 rounded-full bg-indigo-600 ring-2 ring-white" />
              </div>
            </div>

            {/* Presets if configuring */}
            {!activeJourney && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-indigo-900/40">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block mb-2">
                  Frequent Verified Safe Havens:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_DESTINATIONS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setDestinationInput(preset.name)}
                      className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                        destinationInput === preset.name
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/25'
                          : 'bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-indigo-900/40'
                      }`}
                    >
                      <span className="text-xs font-black block">{preset.name}</span>
                      <span className={`text-[11px] block mt-0.5 font-bold ${destinationInput === preset.name ? 'text-indigo-100' : 'text-slate-600 dark:text-slate-400'}`}>
                        {preset.distance} · {preset.time}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="glass-panel rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-indigo-900/50">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-2">
              Autonomous Surveillance Protocol
            </h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
              Journey Guard continuously benchmarks your coordinates against the pre-cleared corridor every 8 seconds. If your vehicle departs from the verified path by more than {settings.deviationThresholdMeters} meters or stops unexpectedly for &gt;{settings.stopTimeoutSeconds}s, the 30-second “Are you safe?” countdown engages immediately.
              {showFullDetails && (
                <span className="block mt-2 text-slate-900 dark:text-white font-extrabold">
                  If the prompt is not acknowledged via your 4-digit security PIN, the system automatically transmits distress telegrams with your live coordinate beacon to your trusted circle, sounds the alarm siren, and locks incident logs into the encrypted Evidence Vault.
                </span>
              )}
            </p>
            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-2 hover:underline inline-block cursor-pointer"
            >
              {showFullDetails ? 'Show less' : 'Read full protocol'}
            </button>
          </div>

          {/* Departure Schedule */}
          <div className="glass-panel rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-indigo-900/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Departure Schedule
                </h3>
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Synchronize timing with trusted circle</p>
              </div>

              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full glass-panel text-xs font-black text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-indigo-900/40">
                <span>Depart Immediately</span>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {SCHEDULE_DAYS.map((item) => {
                const isSelected = selectedDayNum === item.num;
                return (
                  <button
                    key={item.num}
                    onClick={() => {
                      soundManager.triggerHaptic(15);
                      setSelectedDayNum(item.num);
                    }}
                    className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-102 font-black'
                        : 'bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-indigo-900/40 font-bold'
                    }`}
                  >
                    <span className="text-[10px] uppercase">{item.day}</span>
                    <span className="text-sm font-black mt-0.5">{item.num}</span>
                  </button>
                );
              })}
            </div>

            {/* Transit Mode Selection */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-indigo-900/40">
              <span className="text-xs font-black text-slate-900 dark:text-white block mb-2">
                Transit Vehicle Mode
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cab', label: 'Solo Cab', icon: Car },
                  { id: 'walk', label: 'Walk', icon: Footprints },
                  { id: 'transit', label: 'Transit', icon: Bus },
                  { id: 'bike', label: 'Bike', icon: Bike },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = selectedTransportMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedTransportMode(m.id as typeof selectedTransportMode)}
                      className={`py-3 rounded-2xl flex flex-col items-center justify-center border transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/25'
                          : 'bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-indigo-900/40 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1 stroke-[2.4]" />
                      <span className="text-xs font-black">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            {activeJourney ? (
              <button
                onClick={endJourney}
                className="w-full h-14 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl hover:brightness-110 active:scale-98 transition tracking-wide cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-indigo-400 dark:text-indigo-600" />
                <span>I Have Arrived Safely (End Journey)</span>
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="w-full h-14 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-98 transition tracking-wide cursor-pointer"
              >
                <Navigation className="w-5 h-5" />
                <span>Start Protected Journey</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN (col-span-12 lg:col-span-5) ================= */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Visual Corridor Diagram */}
          <div className="glass-panel-dark rounded-[32px] p-6 shadow-xl relative overflow-hidden border border-indigo-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-500/30">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                Corridor Telemetry
              </span>
              <span className="text-xs font-mono font-bold bg-indigo-500/20 px-2.5 py-0.5 rounded-full text-white border border-indigo-400/30">
                GPS Latency: 0.2s
              </span>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/30">
              <div className="w-full h-24 relative flex items-center justify-between px-3">
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1.5 bg-indigo-900 rounded-full" />
                <div className="absolute left-6 w-[55%] top-1/2 -translate-y-1/2 h-1.5 bg-indigo-500 rounded-full" />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 mt-1">Origin</span>
                </div>

                <div className="relative z-10 flex flex-col items-center animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-indigo-700 shadow-lg ring-4 ring-indigo-500/40">
                    <Navigation className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-[10px] text-white font-black mt-1">Live Escort</span>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 shadow">
                    <Compass className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 mt-1">Arrival</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-200">
              <span>Status: Strict Safe Corridor</span>
              <span className="text-indigo-300 font-black">&plusmn;{settings.deviationThresholdMeters}m margin</span>
            </div>
          </div>

          {/* Test Lab Controls (Immediate preview testing) */}
          <div className="glass-panel rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-indigo-900/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Proactive Anomaly Test Lab
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                Demo Verification
              </span>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-4">
              Trigger simulated anomalies to test the automated 30-second countdown and PIN verification dialog:
            </p>

            <div className="space-y-2.5">
              <button
                onClick={simulateDeviation}
                className="w-full p-4 rounded-2xl glass-panel-elevated hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition border border-slate-200 dark:border-indigo-900/40 active:scale-98 shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Simulate Route Deviation (&gt;500m)</span>
                </div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block leading-tight">
                  Simulates vehicle departure off the safe route for &gt;60s.
                </span>
              </button>

              <button
                onClick={simulateStop}
                className="w-full p-4 rounded-2xl glass-panel-elevated hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition border border-slate-200 dark:border-indigo-900/40 active:scale-98 shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white mb-1">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Simulate Unexplained Stop (&gt;60s)</span>
                </div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block leading-tight">
                  Simulates vehicle remaining stationary at unknown location.
                </span>
              </button>
            </div>
          </div>

          {/* Threshold Configurations */}
          <div className="glass-panel rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-indigo-900/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Parameters & Thresholds
                </h3>
              </div>
              <button
                onClick={() => setShowThresholdConfig(!showThresholdConfig)}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {showThresholdConfig ? 'Close' : 'Adjust'}
              </button>
            </div>

            {showThresholdConfig ? (
              <div className="space-y-4 pt-2 text-xs">
                <div>
                  <div className="flex justify-between font-black text-slate-900 dark:text-white mb-1">
                    <span>Deviation Tolerance:</span>
                    <span>{settings.deviationThresholdMeters} meters</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="1000"
                    step="50"
                    value={settings.deviationThresholdMeters}
                    onChange={(e) =>
                      updateSettings({ deviationThresholdMeters: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-black text-slate-900 dark:text-white mb-1">
                    <span>Confirmation Countdown:</span>
                    <span>{settings.countdownSeconds} seconds</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="5"
                    value={settings.countdownSeconds}
                    onChange={(e) =>
                      updateSettings({ countdownSeconds: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">Deviation Max</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">{settings.deviationThresholdMeters}m</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">Stop Timeout</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">{settings.stopTimeoutSeconds}s</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">Countdown</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">{settings.countdownSeconds}s</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
