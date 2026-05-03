import { describe, it, expect, beforeEach } from 'vitest';
import { loadLibrary, saveLibrary, LIBRARY_STORAGE_KEY } from '../src/state/persistence';
import type { Pattern } from '../src/domain/types';

const mkPattern = (name: string): Pattern => ({
  id: 'id-' + name,
  name,
  timeSig: { num: 4, den: 4 },
  subdivision: 16,
  length: 16,
  steps: Array(16).fill('mute'),
});

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns [] when nothing stored', () => {
    expect(loadLibrary()).toEqual([]);
  });

  it('round-trips patterns', () => {
    const patterns = [mkPattern('A'), mkPattern('B')];
    saveLibrary(patterns);
    expect(loadLibrary()).toEqual(patterns);
  });

  it('returns [] for corrupt JSON', () => {
    localStorage.setItem(LIBRARY_STORAGE_KEY, '{not json');
    expect(loadLibrary()).toEqual([]);
  });

  it('returns [] for wrong version', () => {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify({ version: 99, patterns: [] }));
    expect(loadLibrary()).toEqual([]);
  });

  it('saveLibrary swallows quota errors without throwing', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); };
    try {
      expect(() => saveLibrary([mkPattern('A')])).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
