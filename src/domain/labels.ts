import type { Subdivision } from './types';

/** Short form for pickers. */
export const SUBDIV_LABEL: Record<Subdivision, string> = {
  1: 'Whole',
  2: '1/2',
  4: '1/4',
  8: '1/8',
  16: '1/16',
};

/** Spelled-out form for prose. */
export const SUBDIV_NOTE_NAME: Record<Subdivision, string> = {
  1: 'whole',
  2: 'half',
  4: 'quarter',
  8: 'eighth',
  16: 'sixteenth',
};
