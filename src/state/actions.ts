import type { Pattern, PatternMode, StepState, Subdivision, TimeSig } from '../domain/types';

export type Action =
  | { type: 'setBpm'; bpm: number }
  | { type: 'setMode'; mode: PatternMode }
  | { type: 'setMasterVolume'; volume: number }
  | { type: 'setTimeSig'; timeSig: TimeSig }
  | { type: 'setSubdivision'; subdivision: Subdivision }
  | { type: 'setPatternLength'; length: number }
  | { type: 'cycleStep'; index: number }
  | { type: 'setStep'; index: number; state: StepState }
  | { type: 'savePattern'; name: string }
  | { type: 'loadPattern'; id: string }
  | { type: 'deletePattern'; id: string }
  | { type: 'newPattern' }
  | { type: 'libraryLoaded'; patterns: Pattern[] };
