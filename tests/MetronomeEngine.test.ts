import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetronomeEngine } from '../src/audio/MetronomeEngine';
import { FakeAudioContext } from '../src/test-utils/FakeAudioContext';
import type { Pattern } from '../src/domain/types';

const mkPattern = (steps: Pattern['steps']): Pattern => ({
  id: 'p',
  name: '',
  timeSig: { num: 4, den: 4 },
  subdivision: 16,
  length: steps.length,
  steps,
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
