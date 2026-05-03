import { describe, it, expect } from 'vitest';
import {
  stepDurationSeconds,
  stepsPerBar,
  isDownbeat,
  defaultPatternLength,
  resizePattern,
  clampBpm,
  clampVolume,
  isValidMeter,
  makeId,
} from '../src/domain/timing';
import type { StepState } from '../src/domain/types';

describe('stepDurationSeconds', () => {
  it('returns 0.125 for 120 BPM, 1/16 subdivision', () => {
    expect(stepDurationSeconds(120, 16)).toBeCloseTo(0.125, 10);
  });

  it('returns 1.0 for 60 BPM, 1/4 subdivision', () => {
    expect(stepDurationSeconds(60, 4)).toBeCloseTo(1.0, 10);
  });

  it('returns 2.0 for 120 BPM, whole-note step', () => {
    expect(stepDurationSeconds(120, 1)).toBeCloseTo(2.0, 10);
  });

  it('handles decimal BPM', () => {
    expect(stepDurationSeconds(95.5, 16)).toBeCloseTo((60 / 95.5) * (4 / 16), 10);
  });
});

describe('stepsPerBar', () => {
  it('4/4 with 1/16 subdivision = 16', () => {
    expect(stepsPerBar({ num: 4, den: 4 }, 16)).toBe(16);
  });

  it('7/8 with 1/16 subdivision = 14', () => {
    expect(stepsPerBar({ num: 7, den: 8 }, 16)).toBe(14);
  });

  it('3/4 with 1/8 subdivision = 6', () => {
    expect(stepsPerBar({ num: 3, den: 4 }, 8)).toBe(6);
  });

  it('4/4 with whole-note step = 1', () => {
    expect(stepsPerBar({ num: 4, den: 4 }, 1)).toBe(1);
  });
});

describe('isDownbeat', () => {
  it('step 0 is always downbeat', () => {
    expect(isDownbeat(0, { num: 4, den: 4 }, 16)).toBe(true);
  });

  it('step 4 in 4/4 with 1/16 is NOT downbeat (it is beat 2)', () => {
    expect(isDownbeat(4, { num: 4, den: 4 }, 16)).toBe(false);
  });

  it('step 16 in 4/4 with 1/16 IS downbeat (start of bar 2)', () => {
    expect(isDownbeat(16, { num: 4, den: 4 }, 16)).toBe(true);
  });

  it('step 14 in 7/8 with 1/16 IS downbeat (start of bar 2)', () => {
    expect(isDownbeat(14, { num: 7, den: 8 }, 16)).toBe(true);
  });

  it('step 7 in 7/8 with 1/16 is NOT downbeat', () => {
    expect(isDownbeat(7, { num: 7, den: 8 }, 16)).toBe(false);
  });
});

describe('defaultPatternLength', () => {
  it('matches stepsPerBar', () => {
    expect(defaultPatternLength({ num: 4, den: 4 }, 16)).toBe(16);
    expect(defaultPatternLength({ num: 7, den: 8 }, 16)).toBe(14);
    expect(defaultPatternLength({ num: 5, den: 4 }, 8)).toBe(10);
  });
});

describe('resizePattern', () => {
  const steps: StepState[] = ['normal', 'mute', 'accent', 'mute'];

  it('returns same array when length unchanged', () => {
    expect(resizePattern(steps, 4)).toEqual(steps);
  });

  it('truncates from end when shrinking', () => {
    expect(resizePattern(steps, 2)).toEqual(['normal', 'mute']);
  });

  it('pads with mute when growing', () => {
    expect(resizePattern(steps, 6)).toEqual(['normal', 'mute', 'accent', 'mute', 'mute', 'mute']);
  });

  it('result length always equals new length', () => {
    expect(resizePattern(steps, 0)).toHaveLength(0);
    expect(resizePattern(steps, 100)).toHaveLength(100);
  });
});

describe('clampBpm', () => {
  it('clamps below 30 to 30', () => {
    expect(clampBpm(10)).toBe(30);
  });
  it('clamps above 300 to 300', () => {
    expect(clampBpm(500)).toBe(300);
  });
  it('passes through values in range', () => {
    expect(clampBpm(120)).toBe(120);
    expect(clampBpm(95.5)).toBe(95.5);
  });
  it('NaN coerces to 30', () => {
    expect(clampBpm(NaN)).toBe(30);
  });
});

describe('clampVolume', () => {
  it('clamps below 0 to 0', () => {
    expect(clampVolume(-0.5)).toBe(0);
  });
  it('clamps above 1 to 1', () => {
    expect(clampVolume(1.5)).toBe(1);
  });
  it('passes through values in range', () => {
    expect(clampVolume(0.7)).toBe(0.7);
  });
});

describe('isValidMeter', () => {
  it('accepts subdivision >= den', () => {
    expect(isValidMeter({ num: 4, den: 4 }, 16)).toBe(true);
    expect(isValidMeter({ num: 4, den: 4 }, 4)).toBe(true);
    expect(isValidMeter({ num: 7, den: 8 }, 16)).toBe(true);
    expect(isValidMeter({ num: 7, den: 8 }, 8)).toBe(true);
  });

  it('rejects subdivision < den (would yield non-integer stepsPerBar)', () => {
    expect(isValidMeter({ num: 7, den: 8 }, 4)).toBe(false);
    expect(isValidMeter({ num: 4, den: 4 }, 2)).toBe(false);
  });

  it('rejects num <= 0', () => {
    expect(isValidMeter({ num: 0, den: 4 }, 16)).toBe(false);
    expect(isValidMeter({ num: -1, den: 4 }, 16)).toBe(false);
  });
});

describe('makeId', () => {
  it('returns a non-empty string', () => {
    expect(typeof makeId()).toBe('string');
    expect(makeId().length).toBeGreaterThan(0);
  });

  it('returns different ids on consecutive calls', () => {
    expect(makeId()).not.toBe(makeId());
  });
});
