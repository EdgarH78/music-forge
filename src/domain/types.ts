export type StepState = 'mute' | 'normal' | 'accent';

export type Subdivision = 1 | 2 | 4 | 8 | 16;
export type Denominator = 1 | 2 | 4 | 8 | 16;

export interface TimeSig {
  num: number;          // numerator (any positive integer)
  den: Denominator;     // denominator (power of 2 in {1,2,4,8,16})
}

export interface Pattern {
  id: string;
  name: string;
  timeSig: TimeSig;
  subdivision: Subdivision;
  length: number;       // invariant: equals steps.length
  steps: StepState[];
}

export interface MetronomeSettings {
  bpm: number;          // quarter-note BPM, range [30, 300]
  masterVolume: number; // [0, 1]
  pattern: Pattern;
}

export interface PersistedLibrary {
  version: 1;
  patterns: Pattern[];
}

export type Voice = 'downbeat' | 'accent' | 'normal';
