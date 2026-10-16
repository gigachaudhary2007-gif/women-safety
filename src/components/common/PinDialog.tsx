import React, { useState } from 'react';
import { Lock, Delete, X } from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface PinDialogProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onSuccess: (pin: string) => { success: boolean; message: string; isDuress: boolean };
  onCancel: () => void;
  actionLabel?: string;
}

export const PinDialog: React.FC<PinDialogProps> = ({
  isOpen,
  title,
  subtitle = 'Enter your 4-digit security PIN to proceed',
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      soundManager.triggerHaptic(30);
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg(null);
      if (newPin.length === 4) {
        const res = onSuccess(newPin);
        if (!res.success) {
          setErrorMsg(res.message);
          setPin('');
        }
      }
    }
  };

  const handleDelete = () => {
    soundManager.triggerHaptic(20);
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div className="glass-panel-elevated w-full max-w-sm rounded-[32px] p-6 lg:p-7 shadow-2xl border border-slate-200 dark:border-indigo-900/60">
        {/* Header */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/15 text-indigo-700 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-5 leading-relaxed">{subtitle}</p>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-indigo-600 scale-110 shadow-sm'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <div className="mb-4 text-center text-xs font-black text-red-600 bg-red-100 dark:bg-red-950/60 py-2 px-3 rounded-xl border border-red-200 dark:border-red-900 animate-shake">
            {errorMsg}
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-2xl glass-panel text-lg font-black text-slate-900 dark:text-white flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs cursor-pointer border border-slate-200 dark:border-indigo-900/40"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-12 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl glass-panel text-lg font-black text-slate-900 dark:text-white flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs cursor-pointer border border-slate-200 dark:border-indigo-900/40"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-12 rounded-2xl text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            aria-label="Delete last digit"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center pt-2">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
            Default verification PIN is <strong className="text-indigo-700 dark:text-indigo-400 font-black">1234</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
