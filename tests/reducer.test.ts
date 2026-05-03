import { describe, it, expect } from 'vitest';
import { reducer, initialState } from '../src/state/reducer';

describe('initialState', () => {
  it('has BPM 120', () => {
    expect(initialState.settings.bpm).toBe(120);
  });

  it('has 4/4 time signature, 1/16 subdivision', () => {
    expect(initialState.settings.pattern.timeSig).toEqual({ num: 4, den: 4 });
    expect(initialState.settings.pattern.subdivision).toBe(16);
  });

  it('default pattern has 16 steps, all mute', () => {
    const { pattern } = initialState.settings;
    expect(pattern.length).toBe(16);
    expect(pattern.steps).toHaveLength(16);
    expect(pattern.steps.every((s) => s === 'mute')).toBe(true);
  });

  it('master volume is 0.7', () => {
    expect(initialState.settings.masterVolume).toBe(0.7);
  });

  it('library starts empty', () => {
    expect(initialState.library).toEqual([]);
  });
});

describe('reducer no-op', () => {
  it('returns same state for unknown action shape', () => {
    // @ts-expect-error - testing runtime safety
    const next = reducer(initialState, { type: 'nonexistent' });
    expect(next).toBe(initialState);
  });
});
