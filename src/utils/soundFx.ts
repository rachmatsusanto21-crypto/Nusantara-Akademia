// Procedural 16-bit JRPG Web Audio synthesizer (zero external audio files needed)
class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', gainVal = 0.08, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playSelect() {
    this.playTone(660, 0.07, 'square', 0.05);
    this.playTone(880, 0.09, 'square', 0.05, 0.04);
  }

  playStep() {
    this.playTone(220, 0.05, 'triangle', 0.04);
  }

  playAirshipLaunch() {
    this.playTone(196, 0.14, 'triangle', 0.07, 0);
    this.playTone(261.63, 0.14, 'triangle', 0.07, 0.08);
    this.playTone(329.63, 0.2, 'triangle', 0.07, 0.16);
  }

  playHit() {
    this.playTone(523.25, 0.08, 'square', 0.08, 0);
    this.playTone(783.99, 0.12, 'sawtooth', 0.07, 0.06);
  }

  playDamage() {
    this.playTone(180, 0.14, 'sawtooth', 0.09, 0);
    this.playTone(110, 0.22, 'square', 0.08, 0.08);
  }

  playShieldBlock() {
    this.playTone(440, 0.1, 'triangle', 0.08, 0);
    this.playTone(587.33, 0.15, 'triangle', 0.07, 0.05);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => this.playTone(n, 0.18, 'square', 0.07, idx * 0.1));
  }
}

export const soundFx = new RetroSoundEngine();
