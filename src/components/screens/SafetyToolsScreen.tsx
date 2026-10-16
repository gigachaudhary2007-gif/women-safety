import React, { useState, useRef } from 'react';
import {
  Timer,
  PhoneCall,
  Mic,
  Siren,
  Shield,
  BookOpen,
  Send,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Volume2,
  X,
  PhoneIncoming,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import { soundManager } from '../../utils/audio';

export const SafetyToolsScreen: React.FC = () => {
  const { triggerSos, currentLocation, addEvidenceRecord, setActiveTab, showToast } = useSafety();

  const [activeToolModal, setActiveToolModal] = useState<
    'safewalk' | 'fakecall' | 'voicetrigger' | 'report' | 'legalguide' | null
  >(null);

  // 1. Safe-Walk Timer
  const [safeWalkDurationMinutes, setSafeWalkDurationMinutes] = useState<number>(15);
  const [safeWalkRemainingSeconds, setSafeWalkRemainingSeconds] = useState<number | null>(null);
  const safeWalkTimerRef = useRef<number | null>(null);

  // 2. Fake Call
  const [fakeCallerName, setFakeCallerName] = useState<string>('Dad (Home)');
  const [fakeCallDelaySeconds, setFakeCallDelaySeconds] = useState<number>(5);
  const [isFakeCallRinging, setIsFakeCallRinging] = useState<boolean>(false);
  const [isFakeCallActive, setIsFakeCallActive] = useState<boolean>(false);
  const [fakeCallDuration, setFakeCallDuration] = useState<number>(0);
  const fakeCallTimerRef = useRef<number | null>(null);

  // 3. Voice Trigger
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [detectedSpeech, setDetectedSpeech] = useState<string>('');
  const recognitionRef = useRef<unknown>(null);

  // 4. Incident Report Form
  const [reportCategory, setReportCategory] = useState<string>('Poor Lighting / Broken Streetlamps');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false);

  // Safe-Walk Timer Logic
  const startSafeWalk = () => {
    const totalSecs = safeWalkDurationMinutes * 60;
    setSafeWalkRemainingSeconds(totalSecs);
    showToast(`Safe-Walk Timer active for ${safeWalkDurationMinutes} mins`);

    if (safeWalkTimerRef.current) clearInterval(safeWalkTimerRef.current);

    safeWalkTimerRef.current = window.setInterval(() => {
      setSafeWalkRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(safeWalkTimerRef.current!);
          safeWalkTimerRef.current = null;
          triggerSos('Safe-Walk Timer Expired Without Check-In');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSafeWalk = () => {
    if (safeWalkTimerRef.current) {
      clearInterval(safeWalkTimerRef.current);
      safeWalkTimerRef.current = null;
    }
    setSafeWalkRemainingSeconds(null);
    showToast('Safe-Walk Timer cleared. Check-in confirmed.');
  };

  // Fake Call Logic
  const scheduleFakeCall = () => {
    showToast(`Incoming call in ${fakeCallDelaySeconds}s...`);
    setActiveToolModal(null);

    setTimeout(() => {
      setIsFakeCallRinging(true);
      soundManager.startRingtone();
    }, fakeCallDelaySeconds * 1000);
  };

  const acceptFakeCall = () => {
    soundManager.stopRingtone();
    setIsFakeCallRinging(false);
    setIsFakeCallActive(true);
    setFakeCallDuration(0);

    fakeCallTimerRef.current = window.setInterval(() => {
      setFakeCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const endFakeCall = () => {
    soundManager.stopRingtone();
    setIsFakeCallRinging(false);
    setIsFakeCallActive(false);
    if (fakeCallTimerRef.current) {
      clearInterval(fakeCallTimerRef.current);
      fakeCallTimerRef.current = null;
    }
    showToast('Fake call finished');
  };

  // Voice Trigger Logic
  const toggleVoiceTrigger = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser');
      return;
    }

    if (isVoiceListening) {
      try {
        (recognitionRef.current as { stop: () => void })?.stop();
      } catch {}
      showToast('Voice trigger deactivated');
    } else {
      try {
        const recognition = new (SpeechRecognition as any)();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          const results = event.results;
          if (!results || results.length === 0) return;
          const transcript = results[results.length - 1][0].transcript.toLowerCase();
          setDetectedSpeech(transcript);

          if (transcript.includes('help') || transcript.includes('emergency') || transcript.includes('save me')) {
            soundManager.playBeep(990, 0.4);
            triggerSos('Voice Emergency Phrase Detected ("' + transcript + '")');
            recognition.stop();
            setIsVoiceListening(false);
          }
        };

        recognition.onerror = () => {
          setIsVoiceListening(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsVoiceListening(true);
        showToast('Listening for "Help" or "Emergency"...');
      } catch {
        showToast('Voice recognition initialization failed');
      }
    }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim()) return;

    addEvidenceRecord({
      type: 'incident_report',
      coords: currentLocation,
      address: `Incident Report: ${reportCategory}`,
      notes: reportDescription,
      syncedToCloud: true,
    });

    setReportSubmitted(true);
    setTimeout(() => {
      setReportSubmitted(false);
      setReportDescription('');
      setActiveToolModal(null);
      showToast('Anonymous incident report logged to safety network');
    }, 1800);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="h-10 px-4 rounded-2xl glass-panel flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs border border-slate-200 dark:border-indigo-900/40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-indigo-600" />
            <span>Dashboard</span>
          </button>
          <div>
            <h1 className="text-base lg:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Safety Defense Toolkit
            </h1>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden sm:inline">
              Tactical alibis, automated timers, and vocal distress recognition
            </span>
          </div>
        </div>
      </div>

      {/* Active Safe-Walk Banner */}
      {safeWalkRemainingSeconds !== null && (
        <div className="glass-panel-dark rounded-[32px] p-6 shadow-xl border border-indigo-500/30 animate-fadeIn flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                Safe-Walk Timer Active
              </span>
            </div>
            <h2 className="text-2xl font-black text-white">
              {formatTimer(safeWalkRemainingSeconds)} Left
            </h2>
            <p className="text-xs font-bold text-slate-200 mt-1">
              Check in upon safe arrival. If unstopped, emergency SOS initiates automatically.
            </p>
          </div>

          <button
            onClick={cancelSafeWalk}
            className="h-12 px-6 rounded-full bg-white text-slate-900 font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-slate-100 transition shrink-0 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>I Arrived Safely (Stop Timer)</span>
          </button>
        </div>
      )}

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Tool 1: Safe-Walk Timer */}
        <div
          onClick={() => setActiveToolModal('safewalk')}
          className="glass-panel rounded-[32px] p-6 border border-slate-200 dark:border-indigo-900/50 hover:bg-white dark:hover:bg-slate-800/80 active:scale-98 transition cursor-pointer shadow-xs group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/15 text-indigo-700 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-indigo-500/20">
              <Timer className="w-6 h-6 stroke-[2.4]" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Safe-Walk Timer</h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
              Configurable countdown for solo transit. Automatically triggers emergency SOS if check-in fails.
            </p>
          </div>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-4 pt-3 border-t border-slate-200 dark:border-indigo-900/40 flex items-center justify-between">
            <span>Configure Timer</span>
            <span>&rarr;</span>
          </span>
        </div>

        {/* Tool 2: Fake Call Simulator */}
        <div
          onClick={() => setActiveToolModal('fakecall')}
          className="glass-panel rounded-[32px] p-6 border border-slate-200 dark:border-indigo-900/50 hover:bg-white dark:hover:bg-slate-800/80 active:scale-98 transition cursor-pointer shadow-xs group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-amber-500/20">
              <PhoneCall className="w-6 h-6 stroke-[2.4]" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Fake Phone Call</h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
              Realistic incoming call with dual ringtone and escape dialogue cues to deter suspicious followers.
            </p>
          </div>
          <span className="text-xs font-black text-amber-700 dark:text-amber-400 mt-4 pt-3 border-t border-slate-200 dark:border-indigo-900/40 flex items-center justify-between">
            <span>Launch Alibi Call</span>
            <span>&rarr;</span>
          </span>
        </div>

        {/* Tool 3: Voice Keyword Trigger */}
        <div
          onClick={() => setActiveToolModal('voicetrigger')}
          className="glass-panel rounded-[32px] p-6 border border-slate-200 dark:border-indigo-900/50 hover:bg-white dark:hover:bg-slate-800/80 active:scale-98 transition cursor-pointer shadow-xs group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-600/15 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-blue-500/20">
              <Mic className={`w-6 h-6 stroke-[2.4] ${isVoiceListening ? 'text-red-500 animate-pulse' : ''}`} />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Voice Trigger</h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
              Hands-free microphone detection for vocal distress phrases like "Help" or "Emergency".
            </p>
          </div>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-4 pt-3 border-t border-slate-200 dark:border-indigo-900/40 flex items-center justify-between">
            <span>{isVoiceListening ? 'Active (Tap to Stop)' : 'Start Listening'}</span>
            <span>&rarr;</span>
          </span>
        </div>

        {/* Tool 4: Anonymous Incident Reporter */}
        <div
          onClick={() => setActiveToolModal('report')}
          className="glass-panel rounded-[32px] p-6 border border-slate-200 dark:border-indigo-900/50 hover:bg-white dark:hover:bg-slate-800/80 active:scale-98 transition cursor-pointer shadow-xs group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-amber-500/20">
              <AlertTriangle className="w-6 h-6 stroke-[2.4]" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Hazard Reporter</h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
              Flag harassment hotspots, dark alleys, and broken streetlights with coordinates.
            </p>
          </div>
          <span className="text-xs font-black text-amber-700 dark:text-amber-400 mt-4 pt-3 border-t border-slate-200 dark:border-indigo-900/40 flex items-center justify-between">
            <span>File Report</span>
            <span>&rarr;</span>
          </span>
        </div>

        {/* Tool 5: Legal Rights Handbook */}
        <div
          onClick={() => setActiveToolModal('legalguide')}
          className="lg:col-span-2 glass-panel rounded-[32px] p-6 border border-slate-200 dark:border-indigo-900/50 hover:bg-white dark:hover:bg-slate-800/80 active:scale-98 transition cursor-pointer shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/15 text-violet-700 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-500/20">
              <BookOpen className="w-6 h-6 stroke-[2.4]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Legal Rights & Self-Defense Handbook
              </h3>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed max-w-lg">
                Understand Zero FIR provisions, confidential statement rights, and electronic evidence admissibility for digital logs.
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 shrink-0 self-end sm:self-center">
            Read Handbook &rarr;
          </span>
        </div>

      </div>

      {/* MODAL 1: Safe-Walk Timer */}
      {activeToolModal === 'safewalk' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel-elevated w-full max-w-md rounded-[32px] p-6 lg:p-7 shadow-2xl border border-slate-200 dark:border-indigo-900/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-indigo-900/40">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Safe-Walk Timer</h3>
              </div>
              <button
                onClick={() => setActiveToolModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-3">
              Set estimated walk duration. If you do not tap "I Arrived" before the timer expires, Journey Guard automatically escalates Emergency SOS.
            </p>

            <div className="grid grid-cols-3 gap-2.5 my-5">
              {[10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSafeWalkDurationMinutes(mins)}
                  className={`h-12 rounded-2xl text-xs font-black border transition cursor-pointer ${
                    safeWalkDurationMinutes === mins
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/30'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-indigo-900/40'
                  }`}
                >
                  {mins} Minutes
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                startSafeWalk();
                setActiveToolModal(null);
              }}
              className="w-full h-12 rounded-full bg-indigo-600 text-white text-xs font-black shadow-md shadow-indigo-600/30 hover:bg-indigo-700 cursor-pointer"
            >
              Start Safe-Walk ({safeWalkDurationMinutes} min)
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Fake Call Setup */}
      {activeToolModal === 'fakecall' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel-elevated w-full max-w-md rounded-[32px] p-6 lg:p-7 shadow-2xl border border-slate-200 dark:border-indigo-900/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-indigo-900/40">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Fake Call Simulator</h3>
              </div>
              <button
                onClick={() => setActiveToolModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-black text-slate-900 dark:text-white block mb-1">
                  Caller Display Name
                </label>
                <input
                  type="text"
                  value={fakeCallerName}
                  onChange={(e) => setFakeCallerName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-indigo-900/50 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-900 dark:text-white block mb-1">
                  Delay Before Ringing
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 5, 15].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFakeCallDelaySeconds(s)}
                      className={`h-10 rounded-xl text-xs font-black border transition cursor-pointer ${
                        fakeCallDelaySeconds === s
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/25'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-indigo-900/40'
                      }`}
                    >
                      {s}s Delay
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-200 dark:border-indigo-900/40">
              <button
                onClick={scheduleFakeCall}
                className="w-full h-12 rounded-full bg-indigo-600 text-white text-xs font-black shadow-md shadow-indigo-600/30 hover:bg-indigo-700 cursor-pointer"
              >
                Trigger Incoming Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN INCOMING FAKE CALL */}
      {isFakeCallRinging && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between p-8 bg-slate-950 text-white animate-fadeIn">
          <div className="text-center pt-12">
            <span className="text-xs uppercase font-black tracking-widest text-indigo-400 block mb-2">
              Incoming Call...
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight">{fakeCallerName}</h2>
            <p className="text-xs text-slate-400 mt-1">Mobile Carrier</p>
          </div>

          <div className="flex justify-center my-auto">
            <div className="w-32 h-32 rounded-full bg-indigo-600/20 border-2 border-indigo-400 flex items-center justify-center text-white text-4xl font-extrabold animate-pulse">
              {fakeCallerName.charAt(0)}
            </div>
          </div>

          <div className="flex items-center justify-around pb-8 max-w-sm mx-auto w-full">
            <button
              onClick={endFakeCall}
              className="w-20 h-20 rounded-full bg-red-600 text-white flex flex-col items-center justify-center shadow-xl active:scale-95 transition cursor-pointer"
            >
              <PhoneCall className="w-8 h-8 rotate-[135deg]" />
            </button>

            <button
              onClick={acceptFakeCall}
              className="w-20 h-20 rounded-full bg-indigo-600 text-white flex flex-col items-center justify-center shadow-xl animate-bounce active:scale-95 transition cursor-pointer"
            >
              <PhoneCall className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}

      {/* FULL SCREEN ACTIVE FAKE CALL */}
      {isFakeCallActive && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between p-8 bg-slate-950 text-white animate-fadeIn">
          <div className="text-center pt-12">
            <span className="text-xs uppercase font-mono tracking-widest text-indigo-400 block mb-1">
              Connected · {formatTimer(fakeCallDuration)}
            </span>
            <h2 className="text-2xl font-black text-white">{fakeCallerName}</h2>
          </div>

          <div className="glass-panel-dark rounded-[32px] p-6 my-auto max-w-md mx-auto border border-indigo-500/30 text-center">
            <p className="text-xs text-indigo-300 font-black mb-2">
              Conversational Escape Cue:
            </p>
            <p className="text-sm font-semibold text-white italic">
              "Hey! Yes, I see you right there at the main avenue. Stay right there, I'm pulling up in 30 seconds."
            </p>
          </div>

          <div className="flex justify-center pb-8">
            <button
              onClick={endFakeCall}
              className="w-18 h-18 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl active:scale-95 transition cursor-pointer"
            >
              <PhoneCall className="w-7 h-7 rotate-[135deg]" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Voice Trigger */}
      {activeToolModal === 'voicetrigger' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel-elevated w-full max-w-md rounded-[32px] p-6 lg:p-7 shadow-2xl border border-slate-200 dark:border-indigo-900/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-indigo-900/40">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Voice Trigger Detector</h3>
              </div>
              <button
                onClick={() => setActiveToolModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-3 leading-relaxed">
              When active, your browser monitors for vocal distress phrases like <strong>"Help"</strong>, <strong>"Save me"</strong>, or <strong>"Emergency"</strong>.
            </p>

            <div className="my-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-indigo-900/40 text-center">
              <span className="text-[10px] uppercase font-black text-indigo-600 dark:text-indigo-400 block mb-1">
                Listening Status
              </span>
              <span className={`text-sm font-black block ${isVoiceListening ? 'text-red-500 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
                {isVoiceListening ? 'Microphone Active · Listening...' : 'Inactive'}
              </span>
              {detectedSpeech && (
                <p className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-2 bg-slate-200 dark:bg-slate-700 p-2.5 rounded-xl">
                  "{detectedSpeech}"
                </p>
              )}
            </div>

            <button
              onClick={toggleVoiceTrigger}
              className={`w-full h-12 rounded-full text-xs font-black shadow-md transition cursor-pointer ${
                isVoiceListening
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/30'
              }`}
            >
              {isVoiceListening ? 'Stop Listening' : 'Activate Voice Detection'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Incident Report */}
      {activeToolModal === 'report' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel-elevated w-full max-w-md rounded-[32px] p-6 lg:p-7 shadow-2xl border border-slate-200 dark:border-indigo-900/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-indigo-900/40">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Hazard Report</h3>
              </div>
              <button
                onClick={() => setActiveToolModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSubmitted ? (
              <div className="py-8 text-center text-indigo-700 dark:text-indigo-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-indigo-600" />
                <h4 className="text-base font-black">Hazard Report Logged</h4>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">Thank you for contributing to safer communities.</p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white block mb-1">
                    Hazard Classification
                  </label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-indigo-900/50 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Poor Lighting / Broken Streetlamps">Poor Lighting / Broken Streetlamps</option>
                    <option value="Verbal Harassment / Catcalling">Verbal Harassment / Catcalling</option>
                    <option value="Suspicious Stalking / Follower">Suspicious Stalking / Follower</option>
                    <option value="Deserted Transit Corridor">Deserted Transit Corridor</option>
                    <option value="Other Safety Hazard">Other Safety Hazard</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white block mb-1">
                    Details & Specific Location Notes
                  </label>
                  <textarea
                    rows={3}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Describe specific spot, landmark, timing..."
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-indigo-900/50 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  GPS Tag attached: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}. No identifying personal records saved.
                </div>

                <button
                  type="submit"
                  className="w-full h-12 rounded-full bg-indigo-600 text-white text-xs font-black shadow-md shadow-indigo-600/30 hover:bg-indigo-700 cursor-pointer"
                >
                  Submit Anonymous Hazard Report
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: Legal Guide */}
      {activeToolModal === 'legalguide' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel-elevated w-full max-w-lg rounded-[32px] p-6 lg:p-7 shadow-2xl border border-slate-200 dark:border-indigo-900/60 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-indigo-900/40">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Legal & Rights Handbook</h3>
              </div>
              <button
                onClick={() => setActiveToolModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs text-slate-800 dark:text-slate-200">
              <div>
                <h4 className="font-black text-indigo-700 dark:text-indigo-400 text-sm">1. Zero FIR Provision</h4>
                <p className="font-bold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  A woman can register a police First Information Report (FIR) at any police station regardless of jurisdictional boundaries. The police cannot refuse registration.
                </p>
              </div>

              <div>
                <h4 className="font-black text-indigo-700 dark:text-indigo-400 text-sm">2. Confidential Statements</h4>
                <p className="font-bold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  Under legal protections, statements of women victims can be recorded in the presence of a woman police officer or in private quarters without unauthorized male presence.
                </p>
              </div>

              <div>
                <h4 className="font-black text-indigo-700 dark:text-indigo-400 text-sm">3. Digital Evidence Admissibility</h4>
                <p className="font-bold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  GPS coordinate logs, audio recordings from SafeJourney, and timestamped distress beacon messages are admissible electronic evidence under evidence law.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveToolModal(null)}
              className="w-full mt-6 h-12 rounded-full bg-indigo-600 text-white text-xs font-black shadow-md shadow-indigo-600/30 hover:bg-indigo-700 cursor-pointer"
            >
              Done Reading
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
