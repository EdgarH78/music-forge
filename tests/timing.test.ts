import { describe, it, expect } from 'vitest';
import { stepDurationSeconds, stepsPerBar, isDownbeat } from '../src/domain/timing';

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
