import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetronomeEngine } from '../src/audio/MetronomeEngine';
import { FakeAudioContext } from '../src/test-utils/FakeAudioContext';
import type { Pattern } from '../src/domain/types';

const mkPattern = (steps: Pattern['steps']): Pattern => ({
  id: 'p',
  name: '',
  mode: 'custom',
  timeSig: { num: 4, den: 4 },
  subdivision: 16,
  length: steps.length,
  steps,
});

describe('MetronomeEngine scheduling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('schedules each non-mute step in the pattern with correct voice', async () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    engine.setBpm(120);
    engine.setPattern({
      id: 'p', name: '', mode: 'custom', timeSig: { num: 4, den: 4 }, subdivision: 16,
      length: 4, steps: ['normal', 'mute', 'accent', 'mute'],
    });

    const events: { stepIndex: number; audioTime: number; voice: string | null }[] = [];
    engine.subscribeToScheduledSteps((e) => events.push({ ...e, voice: e.voice }));

    await engine.start();
    for (let i = 0; i < 30; i++) {
      ctx.advanceTime(0.025);
      vi.advanceTimersByTime(25);
    }

    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events[0]).toMatchObject({ stepIndex: 0, voice: 'downbeat' });
    expect(events[1]).toMatchObject({ stepIndex: 1, voice: null });
    expect(events[2]).toMatchObject({ stepIndex: 2, voice: 'accent' });
    expect(events[3]).toMatchObject({ stepIndex: 3, voice: null });
  });

  it('produces oscillator.start calls only for sounding steps', async () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    engine.setBpm(120);
    engine.setPattern({
      id: 'p', name: '', mode: 'custom', timeSig: { num: 4, den: 4 }, subdivision: 16,
      length: 4, steps: ['normal', 'mute', 'accent', 'mute'],
    });

    await engine.start();
    for (let i = 0; i < 30; i++) {
      ctx.advanceTime(0.025);
      vi.advanceTimersByTime(25);
    }

    // 4-step loop: 2 sounds per loop. Over ~0.75s at 0.5s/loop: at least 2 sounds.
    expect(ctx.oscillatorStarts.length).toBeGreaterThanOrEqual(2);
    // First oscillator scheduled is downbeat (1500 Hz)
    expect(ctx.oscillatorStarts[0].frequency).toBe(1500);
  });

  it('step duration matches stepDurationSeconds for the chosen subdivision', async () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    engine.setBpm(120);
    engine.setPattern({
      id: 'p', name: '', mode: 'custom', timeSig: { num: 4, den: 4 }, subdivision: 16,
      length: 8,
      steps: ['normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal'],
    });

    const events: { audioTime: number }[] = [];
    engine.subscribeToScheduledSteps((e) => events.push({ audioTime: e.audioTime }));

    await engine.start();
    for (let i = 0; i < 50; i++) {
      ctx.advanceTime(0.025);
      vi.advanceTimersByTime(25);
    }

    // Consecutive events should be 0.125s apart (120 BPM, 1/16)
    for (let i = 1; i < Math.min(events.length, 8); i++) {
      expect(events[i].audioTime - events[i - 1].audioTime).toBeCloseTo(0.125, 5);
    }
  });
});

describe('MetronomeEngine lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('starts in stopped state', () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    expect(engine.isPlaying()).toBe(false);
  });

  it('start() resumes audio context and marks playing', async () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    engine.setBpm(120);
    engine.setPattern(mkPattern(['normal', 'mute', 'normal', 'mute']));
    await engine.start();
    expect(ctx.resume).toHaveBeenCalled();
    expect(engine.isPlaying()).toBe(true);
  });

  it('stop() clears playing state', async () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    engine.setPattern(mkPattern(['normal']));
    await engine.start();
    engine.stop();
    expect(engine.isPlaying()).toBe(false);
  });

  it('stop() is idempotent', () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    expect(() => engine.stop()).not.toThrow();
    expect(() => engine.stop()).not.toThrow();
  });
});

describe('MetronomeEngine visibility handling', () => {
  beforeEach(() => {
    // Reset document.hidden to false between tests since it persists on the global document.
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('uses 100ms schedule-ahead in foreground', () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    expect(engine.getScheduleAheadSecondsForTest()).toBeCloseTo(0.1, 10);
  });

  it('switches to 400ms when document.hidden becomes true', () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(engine.getScheduleAheadSecondsForTest()).toBeCloseTo(0.4, 10);
  });

  it('switches back to 100ms when document.hidden becomes false', () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(engine.getScheduleAheadSecondsForTest()).toBeCloseTo(0.1, 10);
  });
});

describe('MetronomeEngine setMasterVolume', () => {
  it('updates master gain at audioContext.currentTime', () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    ctx.advanceTime(2.0);
    engine.setMasterVolume(0.3);
    const masterGain = ctx.gainNodes[0] as unknown as { gain: { _calls: { value: number; when: number }[] } };
    const lastCall = masterGain.gain._calls[masterGain.gain._calls.length - 1];
    expect(lastCall.value).toBeCloseTo(0.3, 5);
    expect(lastCall.when).toBeCloseTo(2.0, 5);
  });
});
