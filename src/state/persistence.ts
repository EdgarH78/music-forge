import type { Pattern, PersistedLibrary } from '../domain/types';

export const LIBRARY_STORAGE_KEY = 'musicforge.metronome.library.v1';

/** Patterns saved before traditional mode existed have no `mode` field. */
function withDefaultMode(p: Pattern): Pattern {
  return p.mode === 'traditional' || p.mode === 'custom' ? p : { ...p, mode: 'custom' };
}

export function loadLibrary(): Pattern[] {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedLibrary;
    if (parsed.version !== 1 || !Array.isArray(parsed.patterns)) return [];
    return parsed.patterns.map(withDefaultMode);
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
