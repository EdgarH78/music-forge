import type { MetronomeSettings, Pattern, StepState } from '../domain/types';
import {
  defaultPatternLength,
  makeId,
  resizePattern,
  clampBpm,
  clampVolume,
  isValidMeter,
} from '../domain/timing';
import type { Action } from './actions';

export interface State {
  settings: MetronomeSettings;
  library: Pattern[];
}

function makeDefaultPattern(): Pattern {
  const timeSig = { num: 4, den: 4 as const };
  const subdivision = 16 as const;
  const length = defaultPatternLength(timeSig, subdivision);
  return {
    id: makeId(),
    name: '',
    timeSig,
    subdivision,
    length,
    steps: Array(length).fill('mute' as StepState),
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

function withStep(state: State, index: number, newStepState: StepState): State {
  const { steps } = state.settings.pattern;
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

    case 'setTimeSig': {
      const { subdivision } = state.settings.pattern;
      if (!isValidMeter(action.timeSig, subdivision)) return state;
      const newLength = defaultPatternLength(action.timeSig, subdivision);
      return {
        ...state,
        settings: {
          ...state.settings,
          pattern: {
            ...state.settings.pattern,
            timeSig: action.timeSig,
            length: newLength,
            steps: resizePattern(state.settings.pattern.steps, newLength),
          },
        },
      };
    }

    case 'setSubdivision': {
      const { timeSig } = state.settings.pattern;
      if (!isValidMeter(timeSig, action.subdivision)) return state;
      const newLength = defaultPatternLength(timeSig, action.subdivision);
      return {
        ...state,
        settings: {
          ...state.settings,
          pattern: {
            ...state.settings.pattern,
            subdivision: action.subdivision,
            length: newLength,
            steps: resizePattern(state.settings.pattern.steps, newLength),
          },
        },
      };
    }

    case 'setPatternLength': {
      const newLength = clampLength(action.length);
      return {
        ...state,
        settings: {
          ...state.settings,
          pattern: {
            ...state.settings.pattern,
            length: newLength,
            steps: resizePattern(state.settings.pattern.steps, newLength),
          },
        },
      };
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
      const cloned: Pattern = { ...found, id: makeId(), steps: found.steps.slice() };
      return { ...state, settings: { ...state.settings, pattern: cloned } };
    }

    case 'deletePattern':
      return { ...state, library: state.library.filter((p) => p.id !== action.id) };

    case 'newPattern':
      return { ...state, settings: { ...state.settings, pattern: makeDefaultPattern() } };

    case 'libraryLoaded':
      return { ...state, library: action.patterns };

    default:
      return state;
  }
}
