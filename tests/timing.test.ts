import { describe, it, expect } from 'vitest';
import { stepDurationSeconds } from '../src/domain/timing';

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
