import { describe, it, expect } from 'vitest';
import { reducer, initialState } from '../src/state/reducer';
import type { Pattern } from '../src/domain/types';

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

describe('cycleStep', () => {
  it('mute → normal', () => {
    const next = reducer(initialState, { type: 'cycleStep', index: 0 });
    expect(next.settings.pattern.steps[0]).toBe('normal');
  });

  it('normal → accent', () => {
    const after1 = reducer(initialState, { type: 'cycleStep', index: 0 });
    const after2 = reducer(after1, { type: 'cycleStep', index: 0 });
    expect(after2.settings.pattern.steps[0]).toBe('accent');
  });

  it('accent → mute (cycle wraps)', () => {
    const a1 = reducer(initialState, { type: 'cycleStep', index: 0 });
    const a2 = reducer(a1, { type: 'cycleStep', index: 0 });
    const a3 = reducer(a2, { type: 'cycleStep', index: 0 });
    expect(a3.settings.pattern.steps[0]).toBe('mute');
  });

  it('only mutates the targeted index', () => {
    const next = reducer(initialState, { type: 'cycleStep', index: 5 });
    expect(next.settings.pattern.steps[0]).toBe('mute');
    expect(next.settings.pattern.steps[5]).toBe('normal');
  });

  it('no-op when index is out of range', () => {
    const next = reducer(initialState, { type: 'cycleStep', index: 999 });
    expect(next).toBe(initialState);
  });
});

describe('setStep', () => {
  it('sets to specific state', () => {
    const next = reducer(initialState, { type: 'setStep', index: 3, state: 'accent' });
    expect(next.settings.pattern.steps[3]).toBe('accent');
  });

  it('no-op when index is out of range', () => {
    const next = reducer(initialState, { type: 'setStep', index: -1, state: 'accent' });
    expect(next).toBe(initialState);
  });
});

describe('savePattern', () => {
  it('adds current pattern to library with given name and a fresh id', () => {
    const withSteps = reducer(initialState, { type: 'cycleStep', index: 0 });
    const next = reducer(withSteps, { type: 'savePattern', name: 'Cherub Rock' });
    expect(next.library).toHaveLength(1);
    expect(next.library[0].name).toBe('Cherub Rock');
    expect(next.library[0].steps[0]).toBe('normal');
    expect(next.library[0].id).not.toBe(withSteps.settings.pattern.id);
  });

  it('overwrites existing entry with same name', () => {
    const a = reducer(initialState, { type: 'savePattern', name: 'X' });
    const a2 = reducer(a, { type: 'cycleStep', index: 0 });
    const b = reducer(a2, { type: 'savePattern', name: 'X' });
    expect(b.library).toHaveLength(1);
    expect(b.library[0].steps[0]).toBe('normal');
  });
});

describe('loadPattern', () => {
  it('replaces current pattern with library entry (cloned, new id)', () => {
    const saved = reducer(
      reducer(initialState, { type: 'cycleStep', index: 2 }),
      { type: 'savePattern', name: 'A' }
    );
    const loaded = reducer(saved, { type: 'loadPattern', id: saved.library[0].id });
    expect(loaded.settings.pattern.steps[2]).toBe('normal');
    expect(loaded.settings.pattern.name).toBe('A');
    expect(loaded.settings.pattern.id).not.toBe(saved.library[0].id);
  });

  it('no-op for unknown id', () => {
    const next = reducer(initialState, { type: 'loadPattern', id: 'nope' });
    expect(next).toBe(initialState);
  });
});

describe('deletePattern', () => {
  it('removes entry by id', () => {
    const saved = reducer(initialState, { type: 'savePattern', name: 'A' });
    const id = saved.library[0].id;
    const after = reducer(saved, { type: 'deletePattern', id });
    expect(after.library).toEqual([]);
  });
});

describe('newPattern', () => {
  it('replaces current with a fresh default pattern', () => {
    const dirty = reducer(initialState, { type: 'cycleStep', index: 0 });
    const fresh = reducer(dirty, { type: 'newPattern' });
    expect(fresh.settings.pattern.steps.every((s) => s === 'mute')).toBe(true);
    expect(fresh.settings.pattern.length).toBe(16);
    expect(fresh.settings.pattern.name).toBe('');
  });
});

describe('libraryLoaded', () => {
  it('replaces library wholesale (used after localStorage hydrate)', () => {
    const fake: Pattern = {
      id: 'fake-id',
      name: 'Loaded',
      timeSig: { num: 4, den: 4 },
      subdivision: 16,
      length: 16,
      steps: Array(16).fill('mute'),
    };
    const next = reducer(initialState, { type: 'libraryLoaded', patterns: [fake] });
    expect(next.library).toEqual([fake]);
  });
});
