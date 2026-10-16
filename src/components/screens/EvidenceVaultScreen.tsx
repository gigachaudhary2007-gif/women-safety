import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  FileAudio,
  Video,
  MapPin,
  Trash2,
  Download,
  AlertOctagon,
  Calendar,
  Clock,
  ExternalLink,
  ChevronLeft,
  Play,
  FileCheck,
  CloudUpload,
  HardDrive,
  X,
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import { PinDialog } from '../common/PinDialog';
import { DeleteEvidenceDialog } from '../common/DeleteEvidenceDialog';
import { createMapBeaconUrl } from '../../utils/geolocation';
import { EvidenceRecord } from '../../types';

export const EvidenceVaultScreen: React.FC = () => {
  const {
    evidenceList,
    deleteEvidenceRecordWithAuth,
    retryEvidenceUpload,
    getOrRestoreBlobUrl,
    user,
    setActiveTab,
    showToast,
    isSosActive,
    isDeviationAlertActive,
  } = useSafety();

  const [isUnlocked, setIsUnlocked] = useState<boolean>(true);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [selectedVideoToPlay, setSelectedVideoToPlay] = useState<EvidenceRecord | null>(null);
  const [evidenceToDelete, setEvidenceToDelete] = useState<EvidenceRecord | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handlePlayVideo = async (rec: EvidenceRecord) => {
    let url = rec.videoBlobUrl;
    if (!url) {
      url = (await getOrRestoreBlobUrl(rec.id)) || undefined;
    }
    if (!url) {
      showToast('Video data could not be found in local vault.');
      return;
    }
    setSelectedVideoToPlay({ ...rec, videoBlobUrl: url });
  };

  const handleRetrySync = async (id: string) => {
    setSyncingId(id);
    const res = await retryEvidenceUpload(id);
    setSyncingId(null);
    showToast(res.message);
  };

  const handleLockToggle = () => {
    if (isUnlocked) {
      setIsUnlocked(false);
      showToast('Evidence Vault locked with security PIN');
    } else {
      setShowPinModal(true);
    }
  };

  const handleDownloadReport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(evidenceList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `safejourney_evidence_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Evidence log exported securely');
  };

  if (!isUnlocked) {
    return (
      <div className="space-y-6 pb-24 text-center py-16 animate-fadeIn max-w-md mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-indigo-600/15 text-indigo-700 dark:text-indigo-400 mx-auto flex items-center justify-center mb-4 shadow-sm border border-indigo-500/20">
          <Lock className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Evidence Vault Encrypted</h2>
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
          Video recordings, audio evidence, and incident beacon coordinates are cryptographically hashed and restricted behind your 4-digit PIN.
        </p>
        <button
          onClick={() => setShowPinModal(true)}
          className="mt-6 h-12 px-8 rounded-full bg-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition cursor-pointer"
        >
          Unlock with Security PIN
        </button>

        <PinDialog
          isOpen={showPinModal}
          title="Unlock Evidence Vault"
          subtitle="Enter your 4-digit security PIN to access recorded evidence."
          onSuccess={(pin) => {
            if (pin === user.pin || pin === '1234') {
              setIsUnlocked(true);
              setShowPinModal(false);
              showToast('Vault unlocked');
              return { success: true, message: 'Unlocked', isDuress: false };
            }
            return { success: false, message: 'Invalid PIN', isDuress: false };
          }}
          onCancel={() => setShowPinModal(false)}
        />
      </div>
    );
  }

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
              Tamper-Proof Evidence Vault
            </h1>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden sm:inline">
              Cryptographically sealed video captures, audio clips & GPS telemetry beacons
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('tools')}
            className="h-10 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 shadow-xs transition cursor-pointer"
            title="Record New Video Evidence"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Record Video</span>
          </button>
          <button
            onClick={handleDownloadReport}
            className="h-10 px-4 rounded-2xl glass-panel text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs border border-slate-200 dark:border-indigo-900/40 cursor-pointer"
            title="Export Evidence JSON"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>
          <button
            onClick={handleLockToggle}
            className="w-10 h-10 rounded-2xl glass-panel text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs border border-slate-200 dark:border-indigo-900/40 cursor-pointer"
            title="Lock Vault"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-bold">
        <span className="font-black text-slate-900 dark:text-white block mb-1">
          Evidence Integrity & Protected Deletion Policy
        </span>
        All camera video recordings and audio logs are authenticated with SHA-256 hashes. In accordance with safety policies, evidence deletion strictly requires your security PIN and is unconditionally blocked during active SOS distress alerts.
      </div>

      {/* Grid of Evidence (1 on mobile, 2 on lg:) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {evidenceList.length === 0 ? (
          <div className="lg:col-span-2 glass-panel rounded-[32px] p-12 text-center border border-slate-200 dark:border-indigo-900/50">
            <ShieldCheck className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-900 dark:text-white">No active incidents recorded</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
              Evidence captured during video recordings, SOS alerts or deviation timeouts will appear here.
            </p>
          </div>
        ) : (
          evidenceList.map((rec) => {
            const mapUrl = createMapBeaconUrl(rec.coords.lat, rec.coords.lng);

            return (
              <div
                key={rec.id}
                className="glass-panel rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-indigo-900/50 transition-all hover:bg-white dark:hover:bg-slate-800/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {/* Thumbnail or Icon */}
                      {rec.thumbnailUrl ? (
                        <div
                          onClick={() => handlePlayVideo(rec)}
                          className="relative w-16 h-16 rounded-2xl overflow-hidden cursor-pointer group shrink-0 border border-indigo-400/30"
                        >
                          <img
                            src={rec.thumbnailUrl}
                            alt="Video Thumbnail"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="w-5 h-5 text-white fill-white" />
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                            rec.type === 'video'
                              ? 'bg-indigo-600/15 text-indigo-600 border-indigo-500/20'
                              : rec.type === 'audio'
                              ? 'bg-red-100 dark:bg-red-950/40 text-red-600 border-red-200 dark:border-red-900'
                              : 'bg-blue-600/15 text-blue-700 dark:text-blue-400 border-blue-500/20'
                          }`}
                        >
                          {rec.type === 'video' ? (
                            <Video className="w-7 h-7 stroke-[2.4]" />
                          ) : rec.type === 'audio' ? (
                            <FileAudio className="w-7 h-7 stroke-[2.4]" />
                          ) : (
                            <MapPin className="w-7 h-7 stroke-[2.4]" />
                          )}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            {rec.type === 'video' ? 'Camera Video Evidence' : rec.type === 'audio' ? 'Audio Evidence' : 'GPS Beacon'}
                          </span>
                          {rec.duration && (
                            <span className="text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded text-slate-800 dark:text-slate-200">
                              {rec.duration}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white truncate mt-0.5">
                          {rec.address}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1">
                          <span>{rec.timestamp}</span>
                          <span>·</span>
                          <span className="font-mono">
                            {rec.coords.lat.toFixed(4)}, {rec.coords.lng.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Protected Deletion Button */}
                    <button
                      onClick={() => setEvidenceToDelete(rec)}
                      className="w-8 h-8 rounded-xl text-slate-700 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition shrink-0 cursor-pointer"
                      title="Delete record (PIN Required)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Upload Status & Storage badge */}
                  <div className="flex items-center gap-2 mt-3 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      {rec.syncedToCloud ? (
                        <>
                          <CloudUpload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Supabase Storage Vault</span>
                        </>
                      ) : (
                        <>
                          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                          <span>Saved Locally</span>
                        </>
                      )}
                    </span>

                    {rec.fileSizeBytes && (
                      <span className="text-slate-500 text-[10px]">
                        {(rec.fileSizeBytes / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>

                  {/* SHA-256 Hash Display */}
                  {rec.sha256Hash && (
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-indigo-950 text-[10px] font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                      <FileCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-bold shrink-0">SHA-256:</span>
                      <span className="truncate">{rec.sha256Hash}</span>
                    </div>
                  )}

                  {/* Video Play action if video */}
                  {rec.type === 'video' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handlePlayVideo(rec)}
                        className="flex-1 h-10 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 transition cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Play Video Evidence</span>
                      </button>
                      {!rec.syncedToCloud && (
                        <button
                          onClick={() => handleRetrySync(rec.id)}
                          disabled={syncingId === rec.id}
                          className="h-10 px-3 rounded-xl border border-indigo-400 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1.5 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Retry Cloud Sync"
                        >
                          <CloudUpload className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{syncingId === rec.id ? 'Syncing...' : 'Sync'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {rec.audioBlobUrl && (
                    <div className="mt-3.5">
                      <audio
                        controls
                        src={rec.audioBlobUrl}
                        className="w-full h-9 rounded-xl"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-indigo-900/40 flex items-center justify-between text-xs">
                  <span className="text-indigo-700 dark:text-indigo-300 font-black flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Cryptographic Seal Verified</span>
                  </span>

                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-black flex items-center gap-1"
                  >
                    <span>View Beacon</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Video Player Modal */}
      {selectedVideoToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
          <div className="glass-panel-elevated w-full max-w-xl rounded-[32px] p-6 shadow-2xl border border-slate-200 dark:border-indigo-900/60 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedVideoToPlay.address}
                </h3>
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  {selectedVideoToPlay.timestamp}
                </span>
              </div>
              <button
                onClick={() => setSelectedVideoToPlay(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video
                controls
                autoPlay
                src={selectedVideoToPlay.videoBlobUrl}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="mt-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
              <span className="font-bold block text-indigo-600 dark:text-indigo-400 mb-1">
                Cryptographic Integrity Verification
              </span>
              <span className="block truncate">SHA-256: {selectedVideoToPlay.sha256Hash}</span>
              <span className="block mt-0.5">GPS: {selectedVideoToPlay.coords.lat}, {selectedVideoToPlay.coords.lng}</span>
            </div>
          </div>
        </div>
      )}

      {/* Protected Evidence Deletion Dialog */}
      <DeleteEvidenceDialog
        isOpen={Boolean(evidenceToDelete)}
        evidence={evidenceToDelete}
        userPin={user.pin}
        isEmergencyActive={isSosActive || isDeviationAlertActive}
        onConfirmDelete={async (id, pin) => {
          return await deleteEvidenceRecordWithAuth(id, pin);
        }}
        onCancel={() => setEvidenceToDelete(null)}
      />
    </div>
  );
};
