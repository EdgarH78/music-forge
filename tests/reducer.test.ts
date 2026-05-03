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

describe('setTimeSig', () => {
  it('updates time signature when valid given current subdivision', () => {
    const next = reducer(initialState, { type: 'setTimeSig', timeSig: { num: 7, den: 8 } });
    expect(next.settings.pattern.timeSig).toEqual({ num: 7, den: 8 });
  });

  it('resizes pattern to new defaultPatternLength', () => {
    const next = reducer(initialState, { type: 'setTimeSig', timeSig: { num: 7, den: 8 } });
    expect(next.settings.pattern.length).toBe(14);
    expect(next.settings.pattern.steps).toHaveLength(14);
  });

  it('rejects invalid meter (subdivision < den)', () => {
    const sub4 = reducer(initialState, { type: 'setSubdivision', subdivision: 4 });
    const next = reducer(sub4, { type: 'setTimeSig', timeSig: { num: 7, den: 8 } });
    expect(next).toBe(sub4); // unchanged
  });
});

describe('setSubdivision', () => {
  it('updates subdivision and resizes to new defaultPatternLength', () => {
    const next = reducer(initialState, { type: 'setSubdivision', subdivision: 8 });
    expect(next.settings.pattern.subdivision).toBe(8);
    expect(next.settings.pattern.length).toBe(8);
  });

  it('rejects invalid (subdivision < den)', () => {
    const next = reducer(initialState, { type: 'setSubdivision', subdivision: 2 });
    expect(next).toBe(initialState);
  });
});

describe('setPatternLength', () => {
  it('grows pattern, padding with mute', () => {
    const next = reducer(initialState, { type: 'setPatternLength', length: 20 });
    expect(next.settings.pattern.length).toBe(20);
    expect(next.settings.pattern.steps).toHaveLength(20);
    expect(next.settings.pattern.steps.slice(16)).toEqual(['mute', 'mute', 'mute', 'mute']);
  });

  it('shrinks pattern, truncating from end', () => {
    const next = reducer(initialState, { type: 'setPatternLength', length: 8 });
    expect(next.settings.pattern.length).toBe(8);
    expect(next.settings.pattern.steps).toHaveLength(8);
  });

  it('clamps to minimum 1', () => {
    const next = reducer(initialState, { type: 'setPatternLength', length: 0 });
    expect(next.settings.pattern.length).toBe(1);
  });

  it('clamps to a sensible maximum (256)', () => {
    const next = reducer(initialState, { type: 'setPatternLength', length: 1000 });
    expect(next.settings.pattern.length).toBe(256);
  });
});
