import React, { useState, useEffect } from 'react';
import { Trash2, Lock, AlertTriangle, ShieldAlert, X, CheckCircle2, Clock } from 'lucide-react';
import { EvidenceRecord } from '../../types';
import { soundManager } from '../../utils/audio';

interface DeleteEvidenceDialogProps {
  isOpen: boolean;
  evidence: EvidenceRecord | null;
  userPin: string;
  isEmergencyActive: boolean;
  onConfirmDelete: (evidenceId: string, enteredPin: string) => Promise<{ success: boolean; message: string }>;
  onCancel: () => void;
}

export const DeleteEvidenceDialog: React.FC<DeleteEvidenceDialogProps> = ({
  isOpen,
  evidence,
  userPin,
  isEmergencyActive,
  onConfirmDelete,
  onCancel,
}) => {
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  if (!isOpen || !evidence) return null;

  const handleDigit = (digit: string) => {
    if (lockoutSeconds > 0 || isDeleting) return;
    if (enteredPin.length < 4) {
      soundManager.triggerHaptic(25);
      setEnteredPin((prev) => prev + digit);
      setErrorMsg(null);
    }
  };

  const handleDeleteDigit = () => {
    if (lockoutSeconds > 0 || isDeleting) return;
    soundManager.triggerHaptic(15);
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const handleExecuteDelete = async () => {
    if (lockoutSeconds > 0) return;

    if (isEmergencyActive) {
      setErrorMsg('Deletion blocked: Evidence cannot be deleted while an emergency or journey deviation is active.');
      soundManager.playBeep(440, 0.3);
      return;
    }

    if (enteredPin.length !== 4) {
      setErrorMsg('Please enter your complete 4-digit security PIN.');
      return;
    }

    setIsDeleting(true);
    setErrorMsg(null);

    const res = await onConfirmDelete(evidence.id, enteredPin);
    setIsDeleting(false);

    if (!res.success) {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      setEnteredPin('');

      if (nextFailures >= 3) {
        setLockoutSeconds(30);
        setErrorMsg('Too many invalid attempts. Deletion interface locked for 30 seconds.');
      } else {
        setErrorMsg(`${res.message} (${3 - nextFailures} attempts remaining before temporary lockout).`);
      }
    } else {
      setEnteredPin('');
      setFailedAttempts(0);
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn select-none">
      <div className="glass-panel-elevated w-full max-w-md rounded-[32px] p-6 lg:p-7 shadow-2xl border border-red-300 dark:border-red-900/60 max-h-[92vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-600/15 text-red-600 flex items-center justify-center border border-red-500/20">
              <Trash2 className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Protected Evidence Deletion</h3>
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">PIN Authentication Required</span>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning if emergency is currently active */}
        {isEmergencyActive && (
          <div className="mt-3 p-3.5 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse text-red-600" />
            <span>Active emergency in progress. Incident evidence cannot be deleted until emergency is safely resolved.</span>
          </div>
        )}

        {/* Evidence Card Preview */}
        <div className="my-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          {evidence.thumbnailUrl ? (
            <img
              src={evidence.thumbnailUrl}
              alt="Thumbnail"
              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-300 dark:border-slate-600"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-indigo-600/15 text-indigo-600 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block">
              {evidence.type.toUpperCase()} EVIDENCE
            </span>
            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{evidence.address}</h4>
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 block mt-0.5">
              {evidence.timestamp} · {evidence.sha256Hash ? `${evidence.sha256Hash.slice(0, 12)}...` : 'Hashed'}
            </span>
          </div>
        </div>

        {/* Lockout status banner */}
        {lockoutSeconds > 0 ? (
          <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-center my-3">
            <Clock className="w-6 h-6 text-amber-500 mx-auto mb-1 animate-spin" />
            <span className="text-xs font-black text-amber-800 dark:text-amber-300 block">
              Brute-Force Lockout Active
            </span>
            <span className="text-sm font-black text-amber-700 dark:text-amber-400 mt-1 block">
              Retry available in {lockoutSeconds}s
            </span>
          </div>
        ) : (
          <div>
            <div className="text-center mb-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Enter your 4-digit Security PIN to permanently delete:
              </span>
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((idx) => {
                  const filled = enteredPin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all ${
                        filled ? 'bg-red-600 scale-110 shadow-sm' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 text-xs font-black text-red-700 dark:text-red-300 text-center mb-3">
                {errorMsg}
              </div>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                <button
                  key={n}
                  onClick={() => handleDigit(n)}
                  disabled={lockoutSeconds > 0 || isDeleting}
                  className="h-10 rounded-xl glass-panel text-base font-black text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setEnteredPin('')}
                disabled={lockoutSeconds > 0 || isDeleting}
                className="h-10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => handleDigit('0')}
                disabled={lockoutSeconds > 0 || isDeleting}
                className="h-10 rounded-xl glass-panel text-base font-black text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
              >
                0
              </button>
              <button
                onClick={handleDeleteDigit}
                disabled={lockoutSeconds > 0 || isDeleting}
                className="h-10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 h-12 rounded-full glass-panel text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleExecuteDelete}
            disabled={lockoutSeconds > 0 || isDeleting || isEmergencyActive || enteredPin.length !== 4}
            className={`flex-1 h-12 rounded-full text-xs font-black shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
              lockoutSeconds > 0 || isEmergencyActive || enteredPin.length !== 4
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/30 active:scale-95'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Verifying...' : 'Authorize Deletion'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
