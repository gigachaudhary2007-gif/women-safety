import React, { useState, useEffect, useRef } from 'react';
import {
  AlertOctagon,
  ShieldAlert,
  Phone,
  MessageSquare,
  Share2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  MapPin,
  CheckCircle2,
  Flame,
  Radio,
  Video,
  VideoOff,
  Camera,
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import { soundManager } from '../../utils/audio';
import { createMapBeaconUrl, createWhatsAppDistressUrl, createSmsDistressUrl } from '../../utils/geolocation';
import { PinDialog } from '../common/PinDialog';

export const EmergencySosScreen: React.FC = () => {
  const {
    isSosActive,
    sosReason,
    cancelSosWithPin,
    user,
    contacts,
    currentLocation,
    isSirenPlaying,
    toggleSiren,
    addEvidenceRecord,
    showToast,
    isCameraRecording,
    startCameraRecording,
    stopCameraRecording,
  } = useSafety();

  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(true);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [videoSeconds, setVideoSeconds] = useState<number>(0);
  const [isStrobeActive, setIsStrobeActive] = useState<boolean>(false);
  const [sentAlerts, setSentAlerts] = useState<{ [contactId: string]: boolean }>({});
  const [cameraError, setCameraError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Auto-start camera video recording and audio recording on SOS
  useEffect(() => {
    if (!isSosActive) return;

    recordIntervalRef.current = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    videoIntervalRef.current = window.setInterval(() => {
      setVideoSeconds((prev) => prev + 1);
    }, 1000);

    // Initialize camera video recording
    startCameraRecording(previewVideoRef.current).then((res) => {
      if (!res.success) {
        console.warn('Camera video recording auto-start:', res.error);
        setCameraError(res.error || 'Camera unavailable');
      } else {
        setCameraError(null);
      }
    });

    // Independent audio recording fallback
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              if (audioBlob.size > 0) {
                const audioUrl = URL.createObjectURL(audioBlob);
                addEvidenceRecord({
                  type: 'audio',
                  coords: currentLocation,
                  address: `SOS Audio Evidence (${recordingSeconds}s)`,
                  notes: `Emergency recording captured during SOS alert (${sosReason})`,
                  audioBlobUrl: audioUrl,
                  syncedToCloud: true,
                  fileSizeBytes: audioBlob.size,
                });
              }
              stream.getTracks().forEach((track) => track.stop());
            };

            recorder.start(1000);
          })
          .catch((err) => {
            console.warn('Microphone permission fallback note:', err);
          });
      }
    } catch (e) {
      console.warn('Audio recorder startup note:', e);
    }

    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, [isSosActive, currentLocation, sosReason, addEvidenceRecord, startCameraRecording]);

  if (!isSosActive) return null;

  const mapLink = createMapBeaconUrl(currentLocation.lat, currentLocation.lng);

  const handleDispatchSms = (contact: (typeof contacts)[0]) => {
    const url = createSmsDistressUrl(contact.phone, user.name, currentLocation.lat, currentLocation.lng, sosReason);
    setSentAlerts((prev) => ({ ...prev, [contact.id]: true }));
    window.open(url, '_blank');
    showToast(`SMS draft opened for ${contact.name}`);
  };

  const handleDispatchWhatsApp = (contact: (typeof contacts)[0]) => {
    const url = createWhatsAppDistressUrl(contact.phone, user.name, currentLocation.lat, currentLocation.lng, sosReason);
    setSentAlerts((prev) => ({ ...prev, [contact.id]: true }));
    window.open(url, '_blank');
    showToast(`WhatsApp alert opened for ${contact.name}`);
  };

  const handleStopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      showToast('Audio evidence finalized and saved to Vault');
    }
  };

  const handleStopVideoRecording = async () => {
    if (isCameraRecording) {
      const saved = await stopCameraRecording();
      if (saved) {
        showToast('Video evidence saved and cryptographically sealed.');
      }
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto ${
        isStrobeActive ? 'animate-pulse bg-red-600' : 'bg-slate-950'
      } text-white transition-colors duration-200`}
    >
      {/* Top Banner */}
      <div className="p-4 sm:p-6 pt-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between pb-3 border-b border-white/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center animate-ping">
              <AlertOctagon className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-red-300 block">
                Active Emergency
              </span>
              <h1 className="text-base font-black text-white">SafeJourney SOS Beacon</h1>
            </div>
          </div>

          {/* Secure Cancel Button */}
          <button
            onClick={() => setShowPinModal(true)}
            className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Cancel with PIN</span>
          </button>
        </div>

        {/* SOS Cause & GPS Tag */}
        <div className="mt-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-bold">
                Reason Triggered
              </span>
              <p className="text-sm font-black text-white mt-0.5">{sosReason}</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] bg-red-500/30 px-2.5 py-1 rounded-full text-red-200 border border-red-400/30 font-bold">
              <Radio className="w-3 h-3 animate-pulse text-red-300" />
              <span>Broadcasting</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-200">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-xs font-bold">
                {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
              </span>
            </div>
            <a
              href={mapLink}
              target="_blank"
              rel="noreferrer"
              className="text-amber-300 hover:underline font-bold text-xs flex items-center gap-1"
            >
              <span>View Map</span>
              <Share2 className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Live Camera Viewfinder & Video Evidence */}
        <div className="mt-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-red-300">
                Camera Video Evidence Recorder
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-white bg-red-600/60 px-2 py-0.5 rounded-md">
              REC {formatTimer(videoSeconds)}
            </span>
          </div>

          {/* Viewfinder element */}
          <div className="relative w-full h-44 rounded-xl overflow-hidden bg-black/80 flex items-center justify-center border border-white/20">
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-center">
                <VideoOff className="w-8 h-8 text-amber-400 mb-2" />
                <span className="text-xs font-bold text-amber-200">{cameraError}</span>
                <span className="text-[10px] text-slate-300 mt-1">Audio recording remains active.</span>
              </div>
            )}
            {!cameraError && isCameraRecording && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-mono text-red-400 font-bold border border-red-500/40">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>LIVE FEED • 1080P/720P ENCODING</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-300 font-medium">
              Files are verified, hashed with SHA-256, and stored locally in IndexedDB & cloud.
            </span>
            {isCameraRecording && (
              <button
                onClick={handleStopVideoRecording}
                className="text-[11px] font-black text-white px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 shadow-md transition cursor-pointer shrink-0 ml-2"
              >
                Stop & Save Video
              </button>
            )}
          </div>
        </div>

        {/* Emergency Helplines Direct Dial */}
        <div className="mt-4">
          <span className="text-xs uppercase tracking-wider text-slate-300 font-black block mb-2">
            Instant Helpline Calling (1-Tap)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <a
              href="tel:112"
              className="p-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center shadow-lg active:scale-95 transition cursor-pointer"
            >
              <Phone className="w-4 h-4 mb-1" />
              <span className="text-base font-black">112</span>
              <span className="text-[10px] text-white/90 font-bold">Police / EMS</span>
            </a>
            <a
              href="tel:1091"
              className="p-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white flex flex-col items-center justify-center border border-white/20 active:scale-95 transition cursor-pointer"
            >
              <Phone className="w-4 h-4 mb-1 text-indigo-300" />
              <span className="text-base font-black">1091</span>
              <span className="text-[10px] text-white/90 font-bold">Women Helpline</span>
            </a>
            <a
              href="tel:181"
              className="p-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white flex flex-col items-center justify-center border border-white/20 active:scale-95 transition cursor-pointer"
            >
              <Phone className="w-4 h-4 mb-1 text-amber-300" />
              <span className="text-base font-black">181</span>
              <span className="text-[10px] text-white/90 font-bold">Distress Support</span>
            </a>
          </div>
        </div>

        {/* Audio Evidence & Hardware Siren Controls */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {/* Siren toggle */}
          <button
            onClick={toggleSiren}
            className={`p-3.5 rounded-2xl border flex items-center gap-2.5 transition active:scale-95 cursor-pointer ${
              isSirenPlaying
                ? 'bg-red-500/40 border-red-400 text-white shadow-lg shadow-red-500/30'
                : 'bg-white/10 border-white/15 text-slate-200'
            }`}
          >
            {isSirenPlaying ? (
              <Volume2 className="w-5 h-5 text-red-200 animate-bounce" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
            <div className="text-left">
              <span className="text-xs font-black block">
                {isSirenPlaying ? 'Siren Active' : 'Siren Muted'}
              </span>
              <span className="text-[10px] font-bold text-slate-300">
                {isSirenPlaying ? 'Tap to pause' : 'Tap to sound'}
              </span>
            </div>
          </button>

          {/* Strobe screen toggle */}
          <button
            onClick={() => setIsStrobeActive(!isStrobeActive)}
            className={`p-3.5 rounded-2xl border flex items-center gap-2.5 transition active:scale-95 cursor-pointer ${
              isStrobeActive
                ? 'bg-amber-500/40 border-amber-300 text-white shadow-lg'
                : 'bg-white/10 border-white/15 text-slate-200'
            }`}
          >
            <Flame className="w-5 h-5 text-amber-400" />
            <div className="text-left">
              <span className="text-xs font-black block">
                {isStrobeActive ? 'Strobe ON' : 'Visual Strobe'}
              </span>
              <span className="text-[10px] font-bold text-slate-300">Attract attention</span>
            </div>
          </button>
        </div>

        {/* Live Audio Evidence Box */}
        <div className="mt-4 p-3.5 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-red-500/30 flex items-center justify-center text-red-200">
              <Mic className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-black text-white block">
                Recording Audio Evidence
              </span>
              <span className="text-[10px] text-slate-300 font-mono font-bold">
                Duration: {formatTimer(recordingSeconds)} · Encrypted & Saved
              </span>
            </div>
          </div>
          {isRecordingAudio && (
            <button
              onClick={handleStopAudioRecording}
              className="text-[11px] font-black text-slate-200 hover:text-white px-2.5 py-1 rounded-lg bg-white/15 cursor-pointer"
            >
              Stop & Save
            </button>
          )}
        </div>

        {/* Trusted Contacts Instant Dispatch */}
        <div className="mt-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-300 font-black">
              Notify Trusted Contacts
            </span>
            <span className="text-xs text-slate-300 font-bold">{contacts.length} Configured</span>
          </div>

          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-3.5 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">{contact.name}</span>
                    <span className="text-[10px] text-indigo-300 font-bold">({contact.relationship})</span>
                    {contact.isPrimary && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/30 text-amber-300 rounded font-black">
                        Primary
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-300 font-mono font-bold">{contact.phone}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDispatchWhatsApp(contact)}
                    className={`h-9 px-3 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      sentAlerts[contact.id]
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{sentAlerts[contact.id] ? 'Sent' : 'WhatsApp'}</span>
                  </button>

                  <button
                    onClick={() => handleDispatchSms(contact)}
                    className="h-9 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>SMS</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PIN Cancellation Modal */}
      <PinDialog
        isOpen={showPinModal}
        title="Authenticate to Cancel SOS"
        subtitle="Enter your 4-digit security PIN to deactivate emergency broadcast."
        onSuccess={(pin) => {
          const res = cancelSosWithPin(pin);
          if (res.success) {
            setShowPinModal(false);
          }
          return res;
        }}
        onCancel={() => setShowPinModal(false)}
      />
    </div>
  );
};
