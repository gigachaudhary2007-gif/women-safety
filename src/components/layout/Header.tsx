import React from 'react';
import {
  MapPin,
  Shield,
  Siren,
  VolumeX,
  ShieldAlert,
  Compass,
  Users,
  Wrench,
  FileText,
  User,
  Monitor,
  Smartphone,
  Sun,
  Moon,
  Sparkles,
  Radio,
  Clock,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import { soundManager } from '../../utils/audio';

export const Header: React.FC = () => {
  const {
    user,
    currentLocation,
    activeJourney,
    triggerSos,
    isSirenPlaying,
    toggleSiren,
    activeTab,
    setActiveTab,
    theme,
    setTheme,
    deviceView,
    setDeviceView,
    setShowAuthModal,
    signOutAction,
  } = useSafety();

  const handleQuickSos = () => {
    soundManager.triggerHaptic([50, 100, 50]);
    triggerSos('Top Header Emergency Tap');
  };

  const navLinks = [
    { id: 'dashboard', label: 'Command Hub', icon: Shield },
    { id: 'journey', label: 'Journey Guard', icon: Compass },
    { id: 'map', label: 'Safety Radar', icon: MapPin },
    { id: 'contacts', label: 'Trusted Circle', icon: Users },
    { id: 'tools', label: 'Safety Tools', icon: Wrench },
    { id: 'evidence', label: 'Evidence Vault', icon: FileText },
    { id: 'history', label: 'Audit Trail', icon: Clock },
  ];

  const isDark = theme === 'dark';

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-b border-slate-200 dark:border-indigo-950/60 shadow-xs transition-colors select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          
          {/* Brand Logo & Active Guard Indicator */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform border border-indigo-400/30">
                <Shield className="w-5 h-5 fill-indigo-400/20 stroke-[2.4]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                    SafeJourney
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                    Pro
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="hidden sm:inline">Active Escort Armed</span>
                  <span className="sm:hidden">Protected</span>
                </div>
              </div>
            </button>
          </div>

          {/* Desktop Web Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const hasJourneyIndicator = item.id === 'journey' && activeJourney;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    soundManager.triggerHaptic(15);
                    setActiveTab(item.id as typeof activeTab);
                  }}
                  className={`relative px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
                  <span className="whitespace-nowrap tracking-wide">{item.label}</span>
                  {hasJourneyIndicator && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Bar: Device Mode Switcher, Theme Toggle, Siren, SOS, Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Dual Web / Mobile View Toggle */}
            <div className="hidden sm:flex items-center p-1 rounded-2xl glass-panel shadow-xs border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  soundManager.triggerHaptic(15);
                  setDeviceView('web');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  deviceView === 'web'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
                }`}
                title="Full Web App Mode"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Web</span>
              </button>
              <button
                onClick={() => {
                  soundManager.triggerHaptic(15);
                  setDeviceView('mobile');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  deviceView === 'mobile'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
                }`}
                title="Interactive Mobile App Simulation"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>App</span>
              </button>
            </div>

            {/* Dark/Light Mood Toggle */}
            <button
              onClick={() => {
                soundManager.triggerHaptic(20);
                setTheme(isDark ? 'light' : 'dark');
              }}
              className="w-9 h-9 rounded-2xl glass-panel flex items-center justify-center text-slate-800 dark:text-slate-100 shadow-xs hover:scale-105 transition cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-700" />}
            </button>

            {/* Siren Alarm Trigger */}
            <button
              onClick={toggleSiren}
              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                isSirenPlaying
                  ? 'glass-panel-emergency text-white animate-bounce shadow-md'
                  : 'glass-panel text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white shadow-xs'
              }`}
              title={isSirenPlaying ? 'Mute Siren Alarm' : 'Sound Emergency Siren'}
              aria-label="Toggle Siren"
            >
              {isSirenPlaying ? <Siren className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Emergency SOS Button */}
            <button
              onClick={handleQuickSos}
              className="h-9 px-4 rounded-2xl glass-panel-emergency text-white text-xs font-black tracking-wider flex items-center gap-1.5 shadow-md shadow-red-600/25 active:scale-95 transition-transform cursor-pointer"
              aria-label="Emergency SOS"
            >
              <ShieldAlert className="w-4 h-4 animate-pulse stroke-[2.5]" />
              <span>SOS</span>
            </button>

            {/* User Profile Avatar / Sign In Button */}
            {user.isLoggedIn ? (
              <button
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2 p-1 rounded-2xl glass-panel hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs group cursor-pointer"
                title="View Profile & Cloud Settings"
              >
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-600 to-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xs border border-indigo-400/30">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.name.charAt(0) || 'U'
                  )}
                </div>
                <span className="hidden xl:inline text-xs font-black text-slate-900 dark:text-white pr-2">
                  {user.name.split(' ')[0]}
                </span>
              </button>
            ) : (
              <button
                onClick={() => {
                  soundManager.triggerHaptic(20);
                  setShowAuthModal(true);
                }}
                className="h-9 px-3.5 rounded-2xl bg-indigo-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/25 hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
                title="Sign In to Sync Journeys & Evidence"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

          </div>
        </div>
      </div>
    </header>
  );
};
