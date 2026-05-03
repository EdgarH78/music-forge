import type { Pattern, Voice } from '../domain/types';
import { stepDurationSeconds, isDownbeat } from '../domain/timing';
import { scheduleVoice } from './voices';

const TICK_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_FOREGROUND_S = 0.1;
const SCHEDULE_AHEAD_BACKGROUND_S = 0.4;

export interface ScheduledStepEvent {
  stepIndex: number;
  audioTime: number;
  voice: Voice | null;
}

export type ScheduledStepListener = (event: ScheduledStepEvent) => void;

export class MetronomeEngine {
  private ctx: AudioContext;
  private bpm = 120;
  private pattern: Pattern | null = null;
  private masterVolume = 0.7;
  private playing = false;
  private nextStepTime = 0;
  private currentStepIndex = 0;
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<ScheduledStepListener>();
  private scheduleAheadS = SCHEDULE_AHEAD_FOREGROUND_S;
  private masterGain: GainNode;

  private handleVisibilityChange = (): void => {
    this.scheduleAheadS = document.hidden
      ? SCHEDULE_AHEAD_BACKGROUND_S
      : SCHEDULE_AHEAD_FOREGROUND_S;
  };

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.connect(ctx.destination);
    this.masterGain.gain.setValueAtTime(this.masterVolume, ctx.currentTime);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  isPlaying(): boolean {
    return this.playing;
  }

  async start(): Promise<void> {
    if (this.playing) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.nextStepTime = this.ctx.currentTime + 0.05; // tiny lead-in
    this.currentStepIndex = 0;
    this.playing = true;
    this.tickHandle = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  setBpm(bpm: number): void { this.bpm = bpm; }
  setPattern(pattern: Pattern): void { this.pattern = pattern; }
  setMasterVolume(v: number): void {
    this.masterVolume = v;
  }

  getCurrentAudioTime(): number {
    return this.ctx.currentTime;
  }

  subscribeToScheduledSteps(cb: ScheduledStepListener): () => void {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  /** @internal — exposed for tests only */
  getScheduleAheadSecondsForTest(): number {
    return this.scheduleAheadS;
  }

  dispose(): void {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private tick(): void {
    if (!this.playing || !this.pattern) return;
    const horizon = this.ctx.currentTime + this.scheduleAheadS;
    while (this.nextStepTime < horizon) {
      const voice = this.pickVoice(this.currentStepIndex);
      if (voice !== null) {
        scheduleVoice(this.ctx, this.masterGain, voice, this.nextStepTime, this.masterVolume);
      }
      const event: ScheduledStepEvent = { stepIndex: this.currentStepIndex, audioTime: this.nextStepTime, voice };
      for (const l of this.listeners) l(event);
      this.nextStepTime += stepDurationSeconds(this.bpm, this.pattern.subdivision);
      this.currentStepIndex = (this.currentStepIndex + 1) % this.pattern.length;
    }
  }

  private pickVoice(stepIndex: number): Voice | null {
    if (!this.pattern) return null;
    const state = this.pattern.steps[stepIndex];
    if (state === 'mute') return null;
    if (isDownbeat(stepIndex, this.pattern.timeSig, this.pattern.subdivision)) return 'downbeat';
    if (state === 'accent') return 'accent';
    return 'normal';
  }
}
