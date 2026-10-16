// Web Audio API Synthesizers for Emergency Siren, Fake Call ringtone, and countdown beeps

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sirenOsc1: OscillatorNode | null = null;
  private sirenOsc2: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenInterval: number | null = null;
  private isSirenActive = false;

  private ringtoneInterval: number | null = null;
  private isRingtoneActive = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a discrete countdown warning beep
  playBeep(freq = 880, duration = 0.15) {
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);

      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Emergency Siren (Dual Tone Alternating Siren)
  startSiren() {
    if (this.isSirenActive) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      this.isSirenActive = true;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();

      let toggle = false;
      osc.frequency.setValueAtTime(750, this.ctx.currentTime);

      this.sirenInterval = window.setInterval(() => {
        if (!this.ctx || !this.isSirenActive) return;
        toggle = !toggle;
        osc.frequency.setValueAtTime(toggle ? 980 : 750, this.ctx.currentTime);
      }, 350);

      this.sirenOsc1 = osc;
      this.sirenGain = gain;

      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    } catch (e) {
      console.warn('Siren audio error:', e);
    }
  }

  stopSiren() {
    this.isSirenActive = false;
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.sirenOsc1) {
      try {
        this.sirenOsc1.stop();
        this.sirenOsc1.disconnect();
      } catch {
        // Ignored
      }
      this.sirenOsc1 = null;
    }
    if (this.sirenGain) {
      try {
        this.sirenGain.disconnect();
      } catch {
        // Ignored
      }
      this.sirenGain = null;
    }
  }

  // Fake Call Ringtone synthesizer (North American / European dual cadence)
  startRingtone() {
    if (this.isRingtoneActive) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      this.isRingtoneActive = true;

      const playRingBurst = () => {
        if (!this.ctx || !this.isRingtoneActive) return;
        const o1 = this.ctx.createOscillator();
        const o2 = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        o1.type = 'sine';
        o2.type = 'sine';
        o1.frequency.setValueAtTime(440, this.ctx.currentTime);
        o2.frequency.setValueAtTime(480, this.ctx.currentTime);

        g.gain.setValueAtTime(0.18, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

        o1.connect(g);
        o2.connect(g);
        g.connect(this.ctx.destination);

        o1.start();
        o2.start();
        o1.stop(this.ctx.currentTime + 1.8);
        o2.stop(this.ctx.currentTime + 1.8);

        if (navigator.vibrate) {
          navigator.vibrate([400, 200, 400]);
        }
      };

      playRingBurst();
      this.ringtoneInterval = window.setInterval(playRingBurst, 3500);
    } catch (e) {
      console.warn('Ringtone error:', e);
    }
  }

  stopRingtone() {
    this.isRingtoneActive = false;
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  triggerHaptic(pattern: number | number[] = 50) {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore vibration error
      }
    }
  }
}

export const soundManager = new AudioEngine();
