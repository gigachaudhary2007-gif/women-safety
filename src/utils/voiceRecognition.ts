/**
 * Voice SOS Activation Engine with multi-token phonetic matching,
 * sliding-window transcript buffer, shouting resilience, and auto-restart.
 */

export interface VoiceTriggerOptions {
  triggerPhrase?: string; // Default: 'SafeJourney, Help'
  onDetected: (transcript: string, confidence: number) => void;
  onStatusChange?: (
    status: 'INACTIVE' | 'LISTENING' | 'DETECTED' | 'ERROR',
    message?: string,
    diagnostics?: { volumeLevel?: number; confidence?: number; transcript?: string }
  ) => void;
  confidenceThreshold?: number; // Default 0.25 (lenient for shouted or noisy speech)
}

/**
 * Normalizes text: lowercases, strips all punctuation, collapses whitespace.
 */
export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Phonetic normalization for common shouted/garbled variants
 */
export function phoneticNormalize(text: string): string {
  let normalized = normalizeTranscript(text);

  // Common speech-to-text mistranscriptions when shouting into mobile microphones:
  // "save" instead of "safe" (due to plosive sound distortion)
  normalized = normalized.replace(/\bsave\b/g, 'safe');
  // "jerney", "gerny", "journy", "jorney", "jurni" -> "journey"
  normalized = normalized.replace(/\b(jerney|gerny|journy|jorney|jurni|jurini)\b/g, 'journey');
  // "halp", "hell", "held", "hop" -> "help" (when preceded by safe journey)
  normalized = normalized.replace(/\b(halp|helpp)\b/g, 'help');

  // "safejourney" as single compound word -> "safe journey"
  normalized = normalized.replace(/\bsafejourney\b/g, 'safe journey');

  return normalized;
}

/**
 * Robust phrase matcher testing exact phrases, phonetic normalizations,
 * and token co-occurrences in shouted or distorted speech.
 */
export function matchEmergencyPhrase(
  transcript: string,
  targetPhrase: string = 'SafeJourney, Help'
): { isMatch: boolean; reason?: string; matchedPhrase?: string } {
  const cleanRaw = normalizeTranscript(transcript);
  const cleanPhonetic = phoneticNormalize(transcript);
  const cleanTarget = phoneticNormalize(targetPhrase);

  // 1. Direct exact or substring matches
  const exactPatterns = [
    'safe journey help',
    'safejourney help',
    'safe journey emergency',
    'safe journey please help',
    'help safe journey',
    'safe journey alert',
    cleanTarget,
  ];

  for (const pattern of exactPatterns) {
    if (pattern && (cleanRaw.includes(pattern) || cleanPhonetic.includes(pattern))) {
      return { isMatch: true, reason: `Direct match with pattern: "${pattern}"`, matchedPhrase: pattern };
    }
  }

  // 2. Token-based co-occurrence matching (handles interleaved words like "Safe journey, someone help!")
  const tokens = cleanPhonetic.split(' ');
  const hasSafe = tokens.includes('safe') || cleanPhonetic.includes('safe');
  const hasJourney = tokens.includes('journey') || cleanPhonetic.includes('journey');
  const hasHelp =
    tokens.includes('help') ||
    tokens.includes('emergency') ||
    tokens.includes('save') ||
    tokens.includes('danger') ||
    cleanPhonetic.includes('help');

  if ((hasSafe && hasJourney && hasHelp) || (hasJourney && hasHelp && cleanPhonetic.length <= 30)) {
    return {
      isMatch: true,
      reason: `Co-occurrence matched: [safe=${hasSafe}, journey=${hasJourney}, help=${hasHelp}]`,
      matchedPhrase: cleanPhonetic,
    };
  }

  // 3. Urgent short distress fallbacks if shouted
  const urgentDisasterKeywords = [
    'save me',
    'emergency help',
    'help me please',
    'sos sos',
    'someone help me',
    'bachao bachao', // Common South Asian distress shout
  ];

  for (const urgent of urgentDisasterKeywords) {
    if (cleanRaw.includes(urgent) || cleanPhonetic.includes(urgent)) {
      return { isMatch: true, reason: `Urgent distress keyword matched: "${urgent}"`, matchedPhrase: urgent };
    }
  }

  return { isMatch: false };
}

export class VoiceSosDetector {
  private recognition: any = null;
  private isRunning: boolean = false;
  private lastTriggerTime: number = 0;
  private readonly cooldownMs: number = 8000; // 8s cooldown to prevent duplicate triggers
  private options: VoiceTriggerOptions;
  private restartTimer: number | null = null;
  private recentTranscriptsBuffer: { text: string; timestamp: number }[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private volumeCheckInterval: number | null = null;
  private currentVolumeLevel: number = 0;

  constructor(options: VoiceTriggerOptions) {
    this.options = {
      triggerPhrase: 'SafeJourney, Help',
      confidenceThreshold: 0.25,
      ...options,
    };
  }

  start(): { supported: boolean; message?: string } {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.options.onStatusChange?.('ERROR', 'Web Speech API is not supported in this browser.');
      return { supported: false, message: 'Web Speech API is not supported in this browser.' };
    }

    this.isRunning = true;
    this.recentTranscriptsBuffer = [];

    // Optional audio volume/metering to support shouting detection
    this.initAudioVolumeMetering();

    return this.initSpeechRecognition(SpeechRecognition);
  }

  private initSpeechRecognition(SpeechRecognition: any): { supported: boolean; message?: string } {
    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3; // Capture up to 3 alternative interpretations for shouted speech
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (!this.isRunning) return;
        this.options.onStatusChange?.(
          'LISTENING',
          `Voice Sentry listening for "${this.options.triggerPhrase || 'SafeJourney, Help'}"`,
          { volumeLevel: this.currentVolumeLevel }
        );
      };

      recognition.onresult = (event: any) => {
        if (!this.isRunning) return;
        const results = event.results;
        if (!results || results.length === 0) return;

        const now = Date.now();

        // Process newly received result items
        for (let i = event.resultIndex; i < results.length; i++) {
          const resultItem = results[i];

          // Check top alternatives
          for (let j = 0; j < Math.min(resultItem.length, 3); j++) {
            const alternative = resultItem[j];
            const transcript = alternative.transcript || '';
            const confidence = alternative.confidence || 0.8; // Interim results may lack confidence property

            if (!transcript.trim()) continue;

            // Push to rolling sliding-window buffer
            this.recentTranscriptsBuffer.push({ text: transcript, timestamp: now });

            // Evaluate individual alternative
            const evaluated = this.evaluateTranscript(transcript, confidence);
            if (evaluated) return;
          }
        }

        // Evaluate accumulated sliding window across the last 6 seconds
        this.pruneRecentBuffer(now);
        const accumulatedText = this.recentTranscriptsBuffer.map((b) => b.text).join(' ');
        if (accumulatedText.length > 5) {
          this.evaluateTranscript(accumulatedText, 0.7);
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        console.warn('Voice recognition engine status:', error);

        if (error === 'no-speech') {
          // Normal timeout when quiet; do not alert user with error
          return;
        }

        if (error === 'not-allowed' || error === 'service-not-allowed') {
          this.isRunning = false;
          this.options.onStatusChange?.('ERROR', 'Microphone permission denied for voice wake-phrase.');
          return;
        }

        if (error === 'aborted') {
          // Expected on clean stop or restart
          return;
        }

        this.options.onStatusChange?.('ERROR', `Voice recognition notice: ${error}`);
      };

      recognition.onend = () => {
        // Safe debounce restart when continuous session ends
        if (this.isRunning) {
          if (this.restartTimer) window.clearTimeout(this.restartTimer);
          this.restartTimer = window.setTimeout(() => {
            if (this.isRunning) {
              try {
                this.recognition.start();
              } catch (err) {
                // If start fails, re-try after a slightly longer backoff
                this.restartTimer = window.setTimeout(() => {
                  if (this.isRunning) {
                    try {
                      this.recognition.start();
                    } catch {}
                  }
                }, 800);
              }
            }
          }, 150);
        }
      };

      recognition.start();
      this.recognition = recognition;
      return { supported: true };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to start speech recognition';
      this.options.onStatusChange?.('ERROR', errMsg);
      return { supported: false, message: errMsg };
    }
  }

  private pruneRecentBuffer(now: number) {
    // Keep transcripts from the last 6 seconds
    const cutoff = now - 6000;
    this.recentTranscriptsBuffer = this.recentTranscriptsBuffer.filter((b) => b.timestamp > cutoff);
  }

  private evaluateTranscript(transcript: string, confidence: number): boolean {
    const now = Date.now();
    if (now - this.lastTriggerTime < this.cooldownMs) {
      return false; // Suppress duplicate triggers during cooldown
    }

    const matchResult = matchEmergencyPhrase(transcript, this.options.triggerPhrase);

    if (matchResult.isMatch) {
      // Shouted speech often has low recognizer confidence or plosive distortion
      const threshold = this.options.confidenceThreshold || 0.25;
      if (confidence < threshold) {
        console.warn('Voice match discarded due to low confidence:', confidence);
        return false;
      }

      this.lastTriggerTime = now;
      this.recentTranscriptsBuffer = [];

      console.info('🚨 Voice SOS Triggered:', matchResult.reason, 'Transcript:', transcript);
      this.options.onStatusChange?.('DETECTED', `Voice SOS Verified: "${transcript}"`, {
        confidence,
        transcript,
        volumeLevel: this.currentVolumeLevel,
      });

      this.options.onDetected(transcript, confidence);
      return true;
    }

    return false;
  }

  private initAudioVolumeMetering() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          this.micStream = stream;
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) return;

          this.audioContext = new AudioContextClass();
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 256;

          const source = this.audioContext.createMediaStreamSource(stream);
          source.connect(this.analyser);

          const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

          this.volumeCheckInterval = window.setInterval(() => {
            if (!this.analyser || !this.isRunning) return;
            this.analyser.getByteFrequencyData(dataArray);

            // Compute root-mean-square volume level
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sum / dataArray.length);
            this.currentVolumeLevel = Math.round(rms);

            // If shouting (volume level > 120), lower confidence threshold slightly for the next 2s
            if (this.currentVolumeLevel > 120) {
              this.options.confidenceThreshold = 0.15;
            } else {
              this.options.confidenceThreshold = 0.25;
            }
          }, 200);
        })
        .catch(() => {
          // If volume metering fails (e.g. mic permission in use), speech recognition continues regardless
        });
    } catch {}
  }

  stop() {
    this.isRunning = false;
    if (this.restartTimer) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.volumeCheckInterval) {
      window.clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }

    this.options.onStatusChange?.('INACTIVE', 'Voice trigger deactivated.');
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
