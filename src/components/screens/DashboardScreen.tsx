import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Compass,
  MapPin,
  Users,
  PhoneCall,
  ChevronRight,
  Navigation,
  Car,
  Footprints,
  Bus,
  Timer,
  AlertTriangle,
  Clock,
  Phone,
  MessageSquare,
  Building,
  CheckCircle2,
  Wrench,
  Lock,
  Radio,
  Activity,
  Share2,
  Battery,
  Wifi,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import { HELPLINE_SHORTCUTS, SAFETY_TIPS, NEARBY_SAFE_PLACES } from '../../data/mockData';
import { soundManager } from '../../utils/audio';
import { createWhatsAppDistressUrl } from '../../utils/geolocation';

export const DashboardScreen: React.FC = () => {
  const {
    user,
    activeJourney,
    contacts,
    currentLocation,
    setActiveTab,
    triggerSos,
    simulateDeviation,
    simulateStop,
    showToast,
    isSirenPlaying,
    toggleSiren,
  } = useSafety();

  const [selectedSafetyMode, setSelectedSafetyMode] = useState<string>('solo_cab');
  const [sosConfirming, setSosConfirming] = useState<boolean>(false);
  const [selectedTip, setSelectedTip] = useState<(typeof SAFETY_TIPS)[0] | null>(null);

  const handleSosHoldTrigger = () => {
    soundManager.triggerHaptic([60, 120, 60]);
    triggerSos('Dashboard Immediate SOS Action');
    setSosConfirming(false);
  };

  const handleQuickWhatsAppAlert = (contact: (typeof contacts)[0]) => {
    soundManager.triggerHaptic(20);
    const url = createWhatsAppDistressUrl(
      contact.phone,
      user.name,
      currentLocation.lat,
      currentLocation.lng,
      'Live GPS Check-in'
    );
    window.open(url, '_blank');
    showToast(`Check-in link opened for ${contact.name}`);
  };

  const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      
      {/* ================= TOP WEB METRIC & TELEMETRY STRIP ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Safety Score Card */}
        <div className="glass-panel rounded-3xl p-3.5 sm:p-4 flex items-center gap-3 border border-slate-200 dark:border-indigo-900/50">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/15 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-400 shrink-0">
            <ShieldCheck className="w-5 h-5 stroke-[2.4]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                98%
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Optimal
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate block">
              Corridor Safety Rating
            </span>
          </div>
        </div>

        {/* GPS Satellite Sync */}
        <div className="glass-panel rounded-3xl p-3.5 sm:p-4 flex items-center gap-3 border border-slate-200 dark:border-indigo-900/50">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/15 dark:bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
            <Radio className="w-5 h-5 stroke-[2.4] animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                14 Sats
              </span>
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate block font-mono">
              {currentLocation.lat.toFixed(2)}, {currentLocation.lng.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Real-time Decibel / Ambient Monitor */}
        <div className="glass-panel rounded-3xl p-3.5 sm:p-4 flex items-center gap-3 border border-slate-200 dark:border-indigo-900/50">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-amber-400/20 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
            <Activity className="w-5 h-5 stroke-[2.4]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                42 dB
              </span>
              <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase">
                Quiet
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate block">
              Audio Sentry Active
            </span>
          </div>
        </div>

        {/* Trusted Circle Status */}
        <div className="glass-panel rounded-3xl p-3.5 sm:p-4 flex items-center gap-3 border border-slate-200 dark:border-indigo-900/50">
          <div className="w-10 h-10 rounded-2xl bg-violet-600/15 dark:bg-violet-500/20 flex items-center justify-center text-violet-700 dark:text-violet-400 shrink-0">
            <Users className="w-5 h-5 stroke-[2.4]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {contacts.length} Ready
              </span>
              <span className="text-[10px] font-black text-violet-700 dark:text-violet-400 uppercase">
                Synced
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate block">
              Instant Beacon Hub
            </span>
          </div>
        </div>

      </div>

      {/* ================= MAIN RESPONSIVE CANVAS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ================= LEFT / MAIN WEB COLUMN (lg:col-span-8) ================= */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. HERO ESCORT CARD */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {activeJourney ? 'Active Escort Corridor' : 'Proactive Journey Guard'}
              </span>
              <button
                onClick={() => setActiveTab('journey')}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Navigation</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeJourney ? (
              /* Active Journey Live Escort */
              <div className="glass-panel-dark rounded-[32px] p-6 lg:p-7 shadow-2xl relative overflow-hidden border border-indigo-500/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 p-1 border border-indigo-400/40 flex items-center justify-center text-white shrink-0">
                      <Navigation className="w-7 h-7 text-indigo-300 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
                          Live GPS Corridor Active
                        </span>
                      </div>
                      <h3 className="text-xl lg:text-2xl font-black text-white tracking-tight">
                        Destination: {activeJourney.destination}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 mt-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>ETA {activeJourney.estimatedArrival}</span>
                        <span>·</span>
                        <span>{activeJourney.distanceKm} km left</span>
                        <span>·</span>
                        <span className="capitalize">{activeJourney.transportMode} Escort</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={simulateDeviation}
                      className="flex-1 sm:flex-initial h-11 px-5 rounded-full bg-white text-slate-900 font-black text-xs flex items-center justify-center shadow hover:bg-slate-100 active:scale-95 transition cursor-pointer"
                    >
                      Test Deviation Alert
                    </button>
                    <button
                      onClick={() => setActiveTab('journey')}
                      className="flex-1 sm:flex-initial h-11 px-5 rounded-full bg-indigo-600 border border-indigo-400 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition cursor-pointer"
                    >
                      <Compass className="w-4 h-4 text-indigo-200" />
                      <span>Live Radar</span>
                    </button>
                  </div>
                </div>

                {/* Live Route Visualizer Mini-Bar */}
                <div className="mt-5 pt-4 border-t border-indigo-500/30">
                  <div className="flex items-center justify-between text-[11px] text-slate-200 font-bold mb-1.5">
                    <span>{activeJourney.origin}</span>
                    <span className="text-indigo-300 font-black">Route Deviation Threshold: 500m</span>
                    <span>{activeJourney.destination}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-indigo-400/20">
                    <div className="w-3/5 h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            ) : (
              /* Standby Guard Hero Card */
              <div className="glass-panel rounded-[32px] p-6 lg:p-7 shadow-lg border border-slate-200 dark:border-indigo-900/50 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 dark:bg-indigo-500/20 p-1 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-400 shrink-0">
                      <ShieldCheck className="w-8 h-8 stroke-[2.4]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                          Continuous Corridor Sentry
                        </span>
                      </div>
                      <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        SafeJourney Autonomous Escort
                      </h2>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 max-w-lg leading-relaxed">
                        Continuous background surveillance monitors your transit route. If your vehicle unexpectedly veers off by more than 500m or remains stationary in an unfamiliar zone, a 30-second verification countdown immediately activates.
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => setActiveTab('tools')}
                      className="flex-1 sm:flex-initial h-11 px-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-xs flex items-center justify-center shadow-xs hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition cursor-pointer"
                    >
                      Safety Tools Suite
                    </button>
                    <button
                      onClick={() => setActiveTab('journey')}
                      className="flex-1 sm:flex-initial h-11 px-5 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Start Protected Journey</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. QUICK ACCESS SAFETY MODES */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Select Escort Protocol
              </h3>
              <button
                onClick={() => setActiveTab('tools')}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Configure Tools
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'solo_cab', label: 'Solo Cab Guard', desc: 'Auto deviation detection', icon: Car },
                { id: 'night_walk', label: 'Night Safe Walk', desc: 'Illuminated safe havens', icon: Footprints },
                { id: 'transit', label: 'Transit Escort', desc: 'Metro/bus arrival check', icon: Bus },
                { id: 'safe_walk', label: 'Walk Timer', desc: 'Countdown auto-dispatch', icon: Timer },
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = selectedSafetyMode === mode.id;

                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      soundManager.triggerHaptic(15);
                      setSelectedSafetyMode(mode.id);
                      if (mode.id === 'safe_walk') setActiveTab('tools');
                    }}
                    className={`p-4 rounded-3xl text-left transition-all duration-200 border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-600/25 scale-102'
                        : 'glass-panel text-slate-900 dark:text-white border-slate-200 dark:border-indigo-900/40 hover:bg-white dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-600/15 text-indigo-700 dark:text-indigo-400'
                      }`}
                    >
                      <Icon className="w-5 h-5 stroke-[2.4]" />
                    </div>
                    <span className="text-xs font-black block">{mode.label}</span>
                    <span
                      className={`text-[11px] block mt-1 font-bold ${
                        isSelected
                          ? 'text-indigo-100'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {mode.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. NATIONAL EMERGENCY TOLL-FREE HELPLINES */}
          <div className="glass-panel rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-indigo-900/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Direct Emergency Hotlines (24/7 Zero-Balance Dial)
                </h3>
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Instant one-touch access to government police and women helplines</p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-600/10 text-blue-800 dark:text-blue-300 border border-blue-500/20">
                Toll Free
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {HELPLINE_SHORTCUTS.map((hl) => (
                <a
                  key={hl.number}
                  href={`tel:${hl.number}`}
                  className="p-4 rounded-2xl glass-panel-elevated hover:bg-white dark:hover:bg-slate-800 active:scale-95 transition flex flex-col items-center text-center shadow-xs border border-slate-200 dark:border-indigo-900/40 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-600/15 dark:bg-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-indigo-700 dark:text-indigo-400 mb-2 transition-colors">
                    <PhoneCall className="w-4 h-4 stroke-[2.4]" />
                  </div>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{hl.number}</span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-0.5 leading-tight">
                    {hl.label}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* 4. SAFETY GUIDES & EMERGENCY RESPONSE PROTOCOLS */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Safety Playbooks & Legal Rights
              </h3>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Expert Vetted</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SAFETY_TIPS.map((tip) => (
                <div
                  key={tip.id}
                  onClick={() => setSelectedTip(tip)}
                  className="glass-panel rounded-3xl p-4 shadow-xs border border-slate-200 dark:border-indigo-900/40 hover:bg-white dark:hover:bg-slate-800 active:scale-98 transition flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="w-full h-32 rounded-2xl overflow-hidden mb-3 bg-indigo-600/10 relative">
                      <img
                        src={tip.imageUrl}
                        alt={tip.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider block">
                      {tip.category} · {tip.readTime}
                    </span>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white mt-1 leading-snug">
                      {tip.title}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                      {tip.summary}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-indigo-900/40 flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400 font-black">
                    <span>Read Protocol</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ================= RIGHT / SIDEBAR WEB COLUMN (lg:col-span-4) ================= */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. INSTANT HIGH-PRIORITY SOS DISPATCH */}
          <div className="glass-panel-elevated rounded-[32px] p-6 shadow-xl border border-red-300 dark:border-red-900/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-600/15 flex items-center justify-center text-red-600">
                  <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white">Emergency Response</span>
              </div>
              <span className="text-[10px] font-black text-red-600 uppercase tracking-wider">High Alert</span>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
              Instantly notifies your trusted circle with live GPS coordinates, triggers a loud alarm siren, and records tamper-proof evidence.
            </p>

            {sosConfirming ? (
              <div className="p-4 rounded-2xl bg-red-600/10 border border-red-600/30 animate-fadeIn">
                <p className="text-xs font-black text-red-600 text-center mb-3">
                  Confirm Immediate Distress Broadcast?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSosHoldTrigger}
                    className="flex-1 h-12 rounded-full glass-panel-emergency text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>CONFIRM SOS</span>
                  </button>
                  <button
                    onClick={() => setSosConfirming(false)}
                    className="h-12 px-4 rounded-full glass-panel text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setSosConfirming(true)}
                className="w-full h-14 rounded-full glass-panel-emergency text-white font-black text-xs flex items-center justify-center gap-2.5 shadow-xl hover:brightness-105 active:scale-98 transition cursor-pointer"
              >
                <ShieldAlert className="w-5 h-5 animate-pulse stroke-[2.5]" />
                <span className="tracking-wider">ACTIVATE EMERGENCY SOS</span>
              </button>
            )}
          </div>

          {/* 2. TRUSTED CIRCLE QUICK BEACON */}
          <div className="glass-panel rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-indigo-900/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Trusted Circle ({contacts.length})
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('contacts')}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>

            {/* Primary Contact Showcase */}
            {primaryContact && (
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-indigo-900/40 shadow-xs flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden glass-panel border border-slate-200 shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80"
                      alt={primaryContact.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {primaryContact.name}
                      </h4>
                      <span className="text-[9px] font-black px-1.5 py-0.2 bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded border border-amber-500/30">
                        Primary
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block truncate">
                      {primaryContact.relationship} · {primaryContact.phone}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleQuickWhatsAppAlert(primaryContact)}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition active:scale-95 cursor-pointer"
                    title="Send WhatsApp Beacon"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={`tel:${primaryContact.phone}`}
                    className="p-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:brightness-110 transition active:scale-95 cursor-pointer"
                    title="Call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Other Contacts Mini List */}
            <div className="space-y-2">
              {contacts.filter((c) => c.id !== primaryContact?.id).map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-indigo-900/30 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">{c.name}</span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{c.relationship}</span>
                  </div>
                  <a
                    href={`tel:${c.phone}`}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-black hover:underline"
                  >
                    Call
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* 3. NEARBY VERIFIED SAFE HAVENS */}
          <div className="glass-panel rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-indigo-900/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Nearby Safe Havens
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('map')}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Open Map
              </button>
            </div>

            <div className="space-y-2.5">
              {NEARBY_SAFE_PLACES.slice(0, 3).map((place) => (
                <div
                  key={place.id}
                  onClick={() => setActiveTab('map')}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-indigo-900/40 cursor-pointer flex items-center justify-between transition shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">{place.name}</h5>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block truncate">{place.address}</span>
                  </div>
                  <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full bg-indigo-600/15 shrink-0 border border-indigo-500/20">
                    {place.distance}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Safety Tip Modal */}
      {selectedTip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel-elevated w-full max-w-md rounded-[32px] p-6 shadow-2xl border border-slate-200 dark:border-indigo-800">
            <div className="w-full h-48 rounded-2xl overflow-hidden mb-4 bg-slate-100">
              <img
                src={selectedTip.imageUrl}
                alt={selectedTip.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {selectedTip.category} · {selectedTip.readTime}
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 mb-2">
              {selectedTip.title}
            </h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed mb-6">
              {selectedTip.detail}
            </p>
            <button
              onClick={() => setSelectedTip(null)}
              className="w-full h-12 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-lg hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
            >
              Understood Protocol
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
