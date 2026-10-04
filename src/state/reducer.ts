import type {
  MetronomeSettings,
  Pattern,
  PatternMode,
  StepState,
  Subdivision,
  TimeSig,
} from '../domain/types';
import {
  defaultPatternLength,
  makeId,
  resizePattern,
  traditionalSteps,
  clampBpm,
  clampVolume,
  isValidMeter,
} from '../domain/timing';
import type { Action } from './actions';

export interface State {
  settings: MetronomeSettings;
  library: Pattern[];
}

function makeDefaultPattern(mode: PatternMode = 'custom'): Pattern {
  const timeSig = { num: 4, den: 4 as const };
  // Traditional mode opens on quarter notes — the plain click.
  const subdivision: Subdivision = mode === 'traditional' ? 4 : 16;
  const length = defaultPatternLength(timeSig, subdivision);
  return {
    id: makeId(),
    name: '',
    mode,
    timeSig,
    subdivision,
    length,
    steps:
      mode === 'traditional'
        ? traditionalSteps(timeSig, subdivision)
        : Array(length).fill('mute' as StepState),
  };
}

export const initialState: State = {
  settings: {
    bpm: 120,
    masterVolume: 0.7,
    pattern: makeDefaultPattern(),
  },
  library: [],
};

const MIN_PATTERN_LENGTH = 1;
const MAX_PATTERN_LENGTH = 256;

function clampLength(n: number): number {
  if (Number.isNaN(n)) return MIN_PATTERN_LENGTH;
  return Math.max(MIN_PATTERN_LENGTH, Math.min(MAX_PATTERN_LENGTH, Math.floor(n)));
}

const STEP_CYCLE: Record<StepState, StepState> = {
  mute: 'normal',
  normal: 'accent',
  accent: 'mute',
};

function withPattern(state: State, pattern: Pattern): State {
  return { ...state, settings: { ...state.settings, pattern } };
}

/** Applies a meter change, rebuilding steps the way the current mode requires. */
function withMeter(state: State, timeSig: TimeSig, subdivision: Subdivision): State {
  const pattern = state.settings.pattern;
  if (!isValidMeter(timeSig, subdivision)) return state;
  const length = defaultPatternLength(timeSig, subdivision);
  const steps =
    pattern.mode === 'traditional'
      ? traditionalSteps(timeSig, subdivision)
      : resizePattern(pattern.steps, length);
  return withPattern(state, { ...pattern, timeSig, subdivision, length, steps });
}

function withStep(state: State, index: number, newStepState: StepState): State {
  const { steps, mode } = state.settings.pattern;
  // Traditional patterns are derived from the meter, not hand-edited.
  if (mode === 'traditional') return state;
  if (index < 0 || index >= steps.length) return state;
  const nextSteps = steps.slice();
  nextSteps[index] = newStepState;
  return {
    ...state,
    settings: {
      ...state.settings,
      pattern: { ...state.settings.pattern, steps: nextSteps },
    },
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setBpm':
      return { ...state, settings: { ...state.settings, bpm: clampBpm(action.bpm) } };

    case 'setMasterVolume':
      return { ...state, settings: { ...state.settings, masterVolume: clampVolume(action.volume) } };

    case 'setMode': {
      const pattern = state.settings.pattern;
      if (pattern.mode === action.mode) return state;
      if (action.mode === 'custom') {
        // Keep the clicks as a starting point for hand-editing.
        return withPattern(state, { ...pattern, mode: 'custom' });
      }
      const steps = traditionalSteps(pattern.timeSig, pattern.subdivision);
      return withPattern(state, {
        ...pattern,
        mode: 'traditional',
        length: steps.length,
        steps,
      });
    }

    case 'setTimeSig':
      return withMeter(state, action.timeSig, state.settings.pattern.subdivision);

    case 'setSubdivision':
      return withMeter(state, state.settings.pattern.timeSig, action.subdivision);

    case 'setPatternLength': {
      const pattern = state.settings.pattern;
      // Traditional patterns are exactly one bar long.
      if (pattern.mode === 'traditional') return state;
      const newLength = clampLength(action.length);
      return withPattern(state, {
        ...pattern,
        length: newLength,
        steps: resizePattern(pattern.steps, newLength),
      });
    }

    case 'cycleStep': {
      const current = state.settings.pattern.steps[action.index];
      if (current === undefined) return state;
      return withStep(state, action.index, STEP_CYCLE[current]);
    }

    case 'setStep':
      return withStep(state, action.index, action.state);

    case 'savePattern': {
      const current = state.settings.pattern;
      const entry: Pattern = { ...current, id: makeId(), name: action.name };
      const filtered = state.library.filter((p) => p.name !== action.name);
      return { ...state, library: [...filtered, entry] };
    }

    case 'loadPattern': {
      const found = state.library.find((p) => p.id === action.id);
      if (!found) return state;
      const cloned: Pattern = {
        ...found,
        id: makeId(),
        mode: found.mode ?? 'custom',
        steps: found.steps.slice(),
      };
      return withPattern(state, cloned);
    }

    case 'deletePattern':
      return { ...state, library: state.library.filter((p) => p.id !== action.id) };

    case 'newPattern':
      return withPattern(state, makeDefaultPattern(state.settings.pattern.mode));

    case 'libraryLoaded':
      return { ...state, library: action.patterns };

    default:
      return state;
  }
}
