import type { Pattern, PersistedLibrary } from '../domain/types';

export const LIBRARY_STORAGE_KEY = 'musicforge.metronome.library.v1';

export function loadLibrary(): Pattern[] {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedLibrary;
    if (parsed.version !== 1 || !Array.isArray(parsed.patterns)) return [];
    return parsed.patterns;
  } catch {
    return [];
  }
}

export function saveLibrary(patterns: Pattern[]): void {
  try {
    const payload: PersistedLibrary = { version: 1, patterns };
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable or quota exceeded; non-fatal
  }
}
