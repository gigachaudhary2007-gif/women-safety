import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, Siren, Lock, StopCircle } from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import { soundManager } from '../../utils/audio';

export const CountdownDialog: React.FC = () => {
  const {
    isDeviationAlertActive,
    deviationCountdown,
    deviationReason,
    confirmSafetyAction,
    triggerSos,
    settings,
  } = useSafety();

  const [enteredPin, setEnteredPin] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<'SAFE' | 'DEACTIVATE'>('SAFE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isDeviationAlertActive) return null;

  const totalSeconds = settings.countdownSeconds || 30;
  const progressPercent = Math.max(0, Math.min(100, (deviationCountdown / totalSeconds) * 100));

  const handleDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      soundManager.triggerHaptic(25);
      const next = enteredPin + digit;
      setEnteredPin(next);
      setErrorMsg(null);

      if (next.length === 4) {
        const res = confirmSafetyAction(next, selectedAction);
        if (!res.success) {
          setErrorMsg(res.message);
          setEnteredPin('');
        }
      }
    }
  };

  const handleManualSos = () => {
    triggerSos('Manual SOS triggered during Journey Guard countdown');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div className="glass-panel-elevated w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-slate-200 dark:border-indigo-900/60 overflow-hidden">
        {/* Urgent Alert Banner */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-red-600/15 flex items-center justify-center text-red-600 shrink-0 border border-red-500/20">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Are You Safe?</h2>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Journey Guard Anomaly Verification</p>
          </div>
        </div>

        {/* Reason card */}
        <div className="glass-panel rounded-2xl p-3.5 mb-3 border border-slate-200 dark:border-indigo-900/40 bg-white dark:bg-slate-800/80">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block mb-0.5">
            PROACTIVE TRIGGER
          </span>
          <p className="text-xs font-bold text-slate-900 dark:text-white">{deviationReason}</p>
        </div>

        {/* 30s Countdown Display */}
        <div className="text-center py-1 mb-2">
          <div className="inline-flex items-center justify-center relative">
            <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 border-red-500/30 bg-slate-50 dark:bg-slate-800/60 shadow-inner">
              <span className="text-2xl font-black text-red-600 tabular-nums tracking-tight">
                {deviationCountdown}
              </span>
              <span className="text-[9px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-wider">
                seconds
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-red-600 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Selector: ACTION A vs ACTION B */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => {
              setSelectedAction('SAFE');
              setEnteredPin('');
            }}
            className={`p-2.5 rounded-xl text-xs font-black border transition cursor-pointer ${
              selectedAction === 'SAFE'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                : 'glass-panel text-slate-700 dark:text-slate-300 border-slate-200 dark:border-indigo-900/40'
            }`}
          >
            Action A: I Am Safe
          </button>
          <button
            onClick={() => {
              setSelectedAction('DEACTIVATE');
              setEnteredPin('');
            }}
            className={`p-2.5 rounded-xl text-xs font-black border transition cursor-pointer ${
              selectedAction === 'DEACTIVATE'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                : 'glass-panel text-slate-700 dark:text-slate-300 border-slate-200 dark:border-indigo-900/40'
            }`}
          >
            Action B: Deactivate Trip
          </button>
        </div>

        {/* PIN Entry Prompt */}
        <div className="mb-3">
          <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-400 font-black mb-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Enter PIN to Authorize {selectedAction === 'SAFE' ? '"I am safe"' : '"Deactivate"'}</span>
          </div>

          <div className="flex justify-center gap-3 mb-2.5">
            {[0, 1, 2, 3].map((idx) => {
              const filled = enteredPin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    filled ? 'bg-indigo-600 scale-110 shadow-sm' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              );
            })}
          </div>

          {errorMsg && (
            <p className="text-xs text-center text-red-600 font-black mb-2">{errorMsg}</p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-1.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <button
                key={n}
                onClick={() => handleDigit(n)}
                className="h-10 rounded-xl glass-panel text-base font-black text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs cursor-pointer"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setEnteredPin('')}
              className="h-10 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="h-10 rounded-xl glass-panel text-base font-black text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs cursor-pointer"
            >
              0
            </button>
            <button
              onClick={() => setEnteredPin((prev) => prev.slice(0, -1))}
              className="h-10 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer"
            >
              ⌫
            </button>
          </div>
        </div>

        {/* Bottom Immediate Escalation */}
        <div className="pt-2 border-t border-slate-200 dark:border-indigo-900/40">
          <button
            onClick={handleManualSos}
            className="w-full h-11 rounded-full glass-panel-emergency text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition cursor-pointer"
          >
            <Siren className="w-4 h-4" />
            <span>In Immediate Danger? Escalate SOS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
