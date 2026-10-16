import React, { useState } from 'react';
import {
  Shield,
  Wifi,
  Battery,
  Signal,
  CheckCircle2,
  Sparkles,
  Navigation,
  Compass,
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import { SwipeButton } from '../common/SwipeButton';
import { soundManager } from '../../utils/audio';

export const OnboardingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { updateUser, theme } = useSafety();
  const [activeSlide, setActiveSlide] = useState<number>(0);

  const slides = [
    {
      titleLine1: 'Trusted Protection',
      titleLine2: 'Seamless Travel',
      titleLine3: 'Always',
      tagline:
        'Proactive AI journey monitoring, verified safe corridors, and emergency circle escalation for complete peace of mind on Web & Mobile.',
      imageUrl:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=85',
      badge: 'Proactive Journey Guard',
    },
    {
      titleLine1: 'Proactive Alert',
      titleLine2: 'Before Escalation',
      titleLine3: 'Guaranteed',
      tagline:
        'If your ride departs by >500m or makes an unexplained stop, an automated 30-second “Are you safe?” countdown activates immediately.',
      imageUrl:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&auto=format&fit=crop&q=85',
      badge: '30s Anomaly Verification',
    },
    {
      titleLine1: 'Private Data',
      titleLine2: 'Strict Zero Tracking',
      titleLine3: 'Protected',
      tagline:
        'Your coordinates are never broadcast outside an active transit escort or distress beacon. Encrypted local evidence vault keeps you in control.',
      imageUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=85',
      badge: 'Encrypted Evidence Vault',
    },
  ];

  const current = slides[activeSlide];

  const handleFinish = () => {
    soundManager.triggerHaptic(30);
    updateUser({ onboardingCompleted: true });
    onComplete();
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none animate-fadeIn ${
        isDark ? 'ambient-bg-dark text-slate-100' : 'ambient-bg-light text-slate-900'
      }`}
    >
      {/* 1. Status Bar */}
      <div className="px-6 pt-3 flex items-center justify-between text-xs font-bold max-w-lg mx-auto w-full text-indigo-900 dark:text-indigo-300">
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <Signal className="w-3.5 h-3.5" />
          <Wifi className="w-3.5 h-3.5" />
          <Battery className="w-4 h-4" />
        </div>
      </div>

      {/* 2. Top Header & Typography */}
      <div className="px-6 pt-4 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-700 to-slate-900 flex items-center justify-center text-white shadow-sm border border-indigo-400/30">
              <Shield className="w-5 h-5 fill-indigo-400/20" />
            </div>
            <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
              SafeJourney
            </span>
          </div>

          <button
            onClick={handleFinish}
            className="text-xs font-black text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition cursor-pointer"
          >
            Skip Intro
          </button>
        </div>

        {/* Big Bold Headline with pulse wave */}
        <div className="mt-2">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {current.titleLine1}
            <br />
            {current.titleLine2}
            <br />
            <span className="inline-flex items-center gap-2">
              <span>{current.titleLine3}</span>
              <svg
                className="w-12 h-5 text-indigo-600"
                viewBox="0 0 48 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 10H14L18 3L24 17L28 7L32 12H46"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </h1>

          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2.5 leading-relaxed max-w-md">
            {current.tagline}
          </p>
        </div>

        {/* 3 Dot indicators */}
        <div className="flex items-center gap-1.5 mt-4">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                soundManager.triggerHaptic(15);
                setActiveSlide(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeSlide
                  ? 'w-7 bg-indigo-600'
                  : 'w-1.5 bg-indigo-300/40 hover:bg-indigo-400'
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* 3. Center Animated Portrait Cutout */}
      <div className="relative flex-1 flex items-end justify-center px-4 overflow-hidden max-w-lg mx-auto w-full">
        <div className="absolute w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl -bottom-10 pointer-events-none" />

        {/* Floating badge */}
        <div className="absolute top-4 left-8 z-20 glass-panel-elevated px-3.5 py-1.5 rounded-2xl shadow-md border border-slate-200 dark:border-indigo-900/60 flex items-center gap-2 animate-float">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
          <span className="text-xs font-black text-indigo-900 dark:text-indigo-200">{current.badge}</span>
        </div>

        <div className="relative z-10 w-full max-w-[340px] sm:max-w-[380px] h-[340px] sm:h-[380px] flex items-end justify-center">
          <img
            src={current.imageUrl}
            alt="SafeJourney Protection"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top rounded-t-[44px] shadow-2xl transition-all duration-500"
          />
          <div
            className={`absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t pointer-events-none ${
              isDark
                ? 'from-[#0A0E1A] via-[#0A0E1A]/60 to-transparent'
                : 'from-[#F8FAFC] via-[#F8FAFC]/60 to-transparent'
            }`}
          />
        </div>
      </div>

      {/* 4. Bottom Interactive "Swipe To Start" slider */}
      <div className="p-6 pt-2 pb-8 max-w-lg mx-auto w-full">
        <SwipeButton
          onSuccess={handleFinish}
          label="Swipe To Start SafeJourney"
        />

        <div className="text-center mt-3">
          <button
            onClick={handleFinish}
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition cursor-pointer"
          >
            Or tap here to enter SafeJourney directly
          </button>
        </div>
      </div>
    </div>
  );
};
