import type { SimEventType } from './types';

class ArcadeSound {
  private ctx: AudioContext | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(m: boolean): void {
    this.muted = m;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'square',
    gainPeak = 0.08,
    delay = 0,
  ): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public trigger(event: SimEventType): void {
    if (this.muted) return;
    this.unlock();
    const jitter = 0.94 + Math.random() * 0.12;
    switch (event) {
      case 'jump':
        this.playTone(280 * jitter, 560 * jitter, 0.11, 'square', 0.055);
        break;
      case 'spring':
        this.playTone(230 * jitter, 760 * jitter, 0.16, 'triangle', 0.09);
        break;
      case 'land':
        this.playTone(150 * jitter, 90, 0.06, 'triangle', 0.06);
        break;
      case 'key':
        this.playTone(660, 880, 0.09, 'square', 0.07, 0);
        this.playTone(880, 1175, 0.14, 'square', 0.07, 0.07);
        break;
      case 'unlock':
        this.playTone(523, 523, 0.08, 'triangle', 0.08, 0);
        this.playTone(659, 659, 0.08, 'triangle', 0.08, 0.07);
        this.playTone(784, 1046, 0.18, 'triangle', 0.09, 0.14);
        break;
      case 'enterDoor':
        this.playTone(440 * jitter, 660 * jitter, 0.09, 'sine', 0.08);
        break;
      case 'button':
        this.playTone(330, 440, 0.07, 'square', 0.05);
        break;
      case 'death':
        this.playTone(300, 110, 0.24, 'sawtooth', 0.07);
        break;
      case 'clear':
        this.playTone(523, 523, 0.1, 'square', 0.07, 0);
        this.playTone(659, 659, 0.1, 'square', 0.07, 0.1);
        this.playTone(784, 784, 0.1, 'square', 0.07, 0.2);
        this.playTone(1046, 1046, 0.28, 'square', 0.08, 0.3);
        break;
    }
  }
}

export const soundFX = new ArcadeSound();
