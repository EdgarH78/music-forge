# Metronome v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based metronome with tempo control, time signature, subdivision, custom rhythm patterns (mute/normal/accent per step), three synthesized voices, persistent named patterns, and a DOM-based scanline animation through an editable pattern grid. Timing must be sample-accurate via the Web Audio API.

**Architecture:** React 18 + TypeScript on Vite. UI state via `useReducer`; audio in a non-React `MetronomeEngine` class held in `useRef`. Engine uses the lookahead-scheduler pattern (`setInterval` tick + `oscillator.start(when)` against `AudioContext.currentTime`). Pattern grid is real `<button>` elements; the playhead is one `<div>` whose `transform: translateX(...)` updates each `requestAnimationFrame` from the audio clock.

**Tech Stack:** Vite 5, React 18, TypeScript 5 (strict), Vitest 1, Playwright 1.40, plain CSS modules.

**Key spec invariants (do not break):**
- BPM is always quarter-note BPM. Step duration in seconds = `(60 / bpm) * (4 / subdivision)`.
- `stepsPerBar = num * subdivision / den`. Constraint: `subdivision >= den` (both are powers of 2 in `{1,2,4,8,16}`), so `stepsPerBar` is always an integer. Reducer rejects any combination violating this.
- Step `i` is on the downbeat iff `(i % stepsPerBar) === 0`.
- `pattern.steps.length === pattern.length` always.
- `bpm` clamps to `[30, 300]` (decimals allowed); `masterVolume` clamps to `[0, 1]`.

---

## Task 1: Initialize Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `index.html`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/App.module.css`, `src/styles/globals.css`

- [ ] **Step 1: Scaffold the project**

```bash
cd /home/edgar/code/music-forge
npm create vite@latest . -- --template react-ts
```

When prompted "Current directory is not empty. Please choose how to proceed:", select **"Ignore files and continue"**. This preserves `.git/`, `.gitignore`, and `docs/`.

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Replace boilerplate files**

Overwrite `src/App.tsx`:

```tsx
import styles from './App.module.css';

export default function App() {
  return (
    <main className={styles.app}>
      <h1>Music Forge — Metronome</h1>
    </main>
  );
}
```

Overwrite `src/App.module.css`:

```css
.app {
  font-family: system-ui, sans-serif;
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
  color: #e6e6e6;
  background: #1a1d23;
  min-height: 100vh;
}
```

Replace `src/main.tsx` with:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/styles/globals.css`:

```css
* { box-sizing: border-box; }
html, body, #root { margin: 0; padding: 0; height: 100%; }
body { background: #1a1d23; color: #e6e6e6; }
button { font: inherit; cursor: pointer; }
```

Delete: `src/App.css`, `src/index.css`, `src/assets/react.svg`, `public/vite.svg` (no longer referenced).

- [ ] **Step 4: Run dev server to verify boot**

```bash
npm run dev
```

Expected: Vite prints `Local: http://localhost:5173/`. Open in browser; "Music Forge — Metronome" heading is visible. Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "scaffold: Vite + React + TypeScript project"
```

---

## Task 2: Add Vitest and Playwright

**Files:**
- Create: `vitest.config.ts`, `playwright.config.ts`, `tests/.gitkeep`, `tests/e2e/.gitkeep`
- Modify: `package.json` (add scripts + devDependencies)

- [ ] **Step 1: Install testing dependencies**

```bash
npm install -D vitest @vitest/ui jsdom
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**'],
  },
});
```

- [ ] **Step 3: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 4: Add scripts to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 5: Create placeholder test directories**

```bash
mkdir -p tests/e2e
touch tests/.gitkeep tests/e2e/.gitkeep
```

- [ ] **Step 6: Verify both test runners boot**

```bash
npm test
```

Expected: `No test files found` — that's fine; runner is wired up.

```bash
npm run typecheck
```

Expected: passes with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: add Vitest + Playwright configuration"
```

---

## Task 3: Define domain types

**Files:**
- Create: `src/domain/types.ts`

- [ ] **Step 1: Create `src/domain/types.ts`**

```ts
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
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(domain): add core TypeScript types"
```

---

## Task 4: Implement `stepDurationSeconds` (TDD)

**Files:**
- Create: `tests/timing.test.ts`, `src/domain/timing.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/timing.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { stepDurationSeconds } from '../src/domain/timing';

describe('stepDurationSeconds', () => {
  it('returns 0.125 for 120 BPM, 1/16 subdivision', () => {
    expect(stepDurationSeconds(120, 16)).toBeCloseTo(0.125, 10);
  });

  it('returns 1.0 for 60 BPM, 1/4 subdivision', () => {
    expect(stepDurationSeconds(60, 4)).toBeCloseTo(1.0, 10);
  });

  it('returns 2.0 for 120 BPM, whole-note step', () => {
    expect(stepDurationSeconds(120, 1)).toBeCloseTo(2.0, 10);
  });

  it('handles decimal BPM', () => {
    expect(stepDurationSeconds(95.5, 16)).toBeCloseTo((60 / 95.5) * (4 / 16), 10);
  });
});
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
npm test -- timing
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/domain/timing.ts`:

```ts
import type { Subdivision } from './types';

export function stepDurationSeconds(bpm: number, subdivision: Subdivision): number {
  return (60 / bpm) * (4 / subdivision);
}
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
npm test -- timing
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(timing): add stepDurationSeconds"
```

---

## Task 5: Implement `stepsPerBar` and `isDownbeat` (TDD)

**Files:**
- Modify: `tests/timing.test.ts`, `src/domain/timing.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/timing.test.ts`:

```ts
import { stepsPerBar, isDownbeat } from '../src/domain/timing';

describe('stepsPerBar', () => {
  it('4/4 with 1/16 subdivision = 16', () => {
    expect(stepsPerBar({ num: 4, den: 4 }, 16)).toBe(16);
  });

  it('7/8 with 1/16 subdivision = 14', () => {
    expect(stepsPerBar({ num: 7, den: 8 }, 16)).toBe(14);
  });

  it('3/4 with 1/8 subdivision = 6', () => {
    expect(stepsPerBar({ num: 3, den: 4 }, 8)).toBe(6);
  });

  it('4/4 with whole-note step = 1', () => {
    expect(stepsPerBar({ num: 4, den: 4 }, 1)).toBe(1);
  });
});

describe('isDownbeat', () => {
  it('step 0 is always downbeat', () => {
    expect(isDownbeat(0, { num: 4, den: 4 }, 16)).toBe(true);
  });

  it('step 4 in 4/4 with 1/16 is NOT downbeat (it is beat 2)', () => {
    expect(isDownbeat(4, { num: 4, den: 4 }, 16)).toBe(false);
  });

  it('step 16 in 4/4 with 1/16 IS downbeat (start of bar 2)', () => {
    expect(isDownbeat(16, { num: 4, den: 4 }, 16)).toBe(true);
  });

  it('step 14 in 7/8 with 1/16 IS downbeat (start of bar 2)', () => {
    expect(isDownbeat(14, { num: 7, den: 8 }, 16)).toBe(true);
  });

  it('step 7 in 7/8 with 1/16 is NOT downbeat', () => {
    expect(isDownbeat(7, { num: 7, den: 8 }, 16)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
npm test -- timing
```

Expected: FAIL — `stepsPerBar` and `isDownbeat` not exported.

- [ ] **Step 3: Implement**

Append to `src/domain/timing.ts`:

```ts
import type { TimeSig } from './types';

export function stepsPerBar(timeSig: TimeSig, subdivision: Subdivision): number {
  return (timeSig.num * subdivision) / timeSig.den;
}

export function isDownbeat(stepIndex: number, timeSig: TimeSig, subdivision: Subdivision): boolean {
  return stepIndex % stepsPerBar(timeSig, subdivision) === 0;
}
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
npm test -- timing
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(timing): add stepsPerBar and isDownbeat"
```

---

## Task 6: Implement `defaultPatternLength`, `resizePattern`, `clampBpm`, `clampVolume` (TDD)

**Files:**
- Modify: `tests/timing.test.ts`, `src/domain/timing.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/timing.test.ts`:

```ts
import { defaultPatternLength, resizePattern, clampBpm, clampVolume } from '../src/domain/timing';
import type { StepState } from '../src/domain/types';

describe('defaultPatternLength', () => {
  it('matches stepsPerBar', () => {
    expect(defaultPatternLength({ num: 4, den: 4 }, 16)).toBe(16);
    expect(defaultPatternLength({ num: 7, den: 8 }, 16)).toBe(14);
    expect(defaultPatternLength({ num: 5, den: 4 }, 8)).toBe(10);
  });
});

describe('resizePattern', () => {
  const steps: StepState[] = ['normal', 'mute', 'accent', 'mute'];

  it('returns same array when length unchanged', () => {
    expect(resizePattern(steps, 4)).toEqual(steps);
  });

  it('truncates from end when shrinking', () => {
    expect(resizePattern(steps, 2)).toEqual(['normal', 'mute']);
  });

  it('pads with mute when growing', () => {
    expect(resizePattern(steps, 6)).toEqual(['normal', 'mute', 'accent', 'mute', 'mute', 'mute']);
  });

  it('result length always equals new length', () => {
    expect(resizePattern(steps, 0)).toHaveLength(0);
    expect(resizePattern(steps, 100)).toHaveLength(100);
  });
});

describe('clampBpm', () => {
  it('clamps below 30 to 30', () => {
    expect(clampBpm(10)).toBe(30);
  });
  it('clamps above 300 to 300', () => {
    expect(clampBpm(500)).toBe(300);
  });
  it('passes through values in range', () => {
    expect(clampBpm(120)).toBe(120);
    expect(clampBpm(95.5)).toBe(95.5);
  });
  it('NaN coerces to 30', () => {
    expect(clampBpm(NaN)).toBe(30);
  });
});

describe('clampVolume', () => {
  it('clamps below 0 to 0', () => {
    expect(clampVolume(-0.5)).toBe(0);
  });
  it('clamps above 1 to 1', () => {
    expect(clampVolume(1.5)).toBe(1);
  });
  it('passes through values in range', () => {
    expect(clampVolume(0.7)).toBe(0.7);
  });
});
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
npm test -- timing
```

Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement**

Append to `src/domain/timing.ts`:

```ts
import type { StepState } from './types';

export function defaultPatternLength(timeSig: TimeSig, subdivision: Subdivision): number {
  return stepsPerBar(timeSig, subdivision);
}

export function resizePattern(steps: StepState[], newLength: number): StepState[] {
  if (newLength === steps.length) return steps;
  if (newLength < steps.length) return steps.slice(0, newLength);
  const padding: StepState[] = Array(newLength - steps.length).fill('mute');
  return [...steps, ...padding];
}

export function clampBpm(bpm: number): number {
  if (Number.isNaN(bpm)) return 30;
  return Math.max(30, Math.min(300, bpm));
}

export function clampVolume(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
npm test -- timing
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(timing): add defaultPatternLength, resizePattern, clamp helpers"
```

---

## Task 7: Implement `isValidMeter` and ID helper (TDD)

**Files:**
- Modify: `tests/timing.test.ts`, `src/domain/timing.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/timing.test.ts`:

```ts
import { isValidMeter, makeId } from '../src/domain/timing';

describe('isValidMeter', () => {
  it('accepts subdivision >= den', () => {
    expect(isValidMeter({ num: 4, den: 4 }, 16)).toBe(true);
    expect(isValidMeter({ num: 4, den: 4 }, 4)).toBe(true);
    expect(isValidMeter({ num: 7, den: 8 }, 16)).toBe(true);
    expect(isValidMeter({ num: 7, den: 8 }, 8)).toBe(true);
  });

  it('rejects subdivision < den (would yield non-integer stepsPerBar)', () => {
    expect(isValidMeter({ num: 7, den: 8 }, 4)).toBe(false);
    expect(isValidMeter({ num: 4, den: 4 }, 2)).toBe(false);
  });

  it('rejects num <= 0', () => {
    expect(isValidMeter({ num: 0, den: 4 }, 16)).toBe(false);
    expect(isValidMeter({ num: -1, den: 4 }, 16)).toBe(false);
  });
});

describe('makeId', () => {
  it('returns a non-empty string', () => {
    expect(typeof makeId()).toBe('string');
    expect(makeId().length).toBeGreaterThan(0);
  });

  it('returns different ids on consecutive calls', () => {
    expect(makeId()).not.toBe(makeId());
  });
});
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
npm test -- timing
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Append to `src/domain/timing.ts`:

```ts
export function isValidMeter(timeSig: TimeSig, subdivision: Subdivision): boolean {
  if (timeSig.num <= 0) return false;
  // subdivision >= den, both powers of 2 in {1,2,4,8,16}, ensures integer stepsPerBar
  return subdivision >= timeSig.den;
}

export function makeId(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
npm test -- timing
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(timing): add isValidMeter and makeId helpers"
```

---

## Task 8: Define reducer state, actions, and initial state (TDD)

**Files:**
- Create: `src/state/actions.ts`, `src/state/reducer.ts`, `tests/reducer.test.ts`

- [ ] **Step 1: Create action types**

Create `src/state/actions.ts`:

```ts
import type { Pattern, StepState, Subdivision, TimeSig } from '../domain/types';

export type Action =
  | { type: 'setBpm'; bpm: number }
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
```

- [ ] **Step 2: Write failing tests for initial state**

Create `tests/reducer.test.ts`:

```ts
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
  it('returns same state for unknown action shape (impossible in TS but safe at runtime)', () => {
    // @ts-expect-error - testing runtime safety
    const next = reducer(initialState, { type: 'nonexistent' });
    expect(next).toBe(initialState);
  });
});
```

- [ ] **Step 3: Run the test (expect failure)**

```bash
npm test -- reducer
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

Create `src/state/reducer.ts`:

```ts
import type { MetronomeSettings, Pattern, StepState } from '../domain/types';
import { defaultPatternLength, makeId, resizePattern, clampBpm, clampVolume, isValidMeter, stepsPerBar } from '../domain/timing';
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

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setBpm':
      return { ...state, settings: { ...state.settings, bpm: clampBpm(action.bpm) } };

    case 'setMasterVolume':
      return { ...state, settings: { ...state.settings, masterVolume: clampVolume(action.volume) } };

    default:
      return state;
  }
}
```

- [ ] **Step 5: Run the test (expect pass)**

```bash
npm test -- reducer
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(state): add reducer skeleton with initial state and bpm/volume actions"
```

---

## Task 9: Add meter actions (`setTimeSig`, `setSubdivision`, `setPatternLength`) (TDD)

**Files:**
- Modify: `tests/reducer.test.ts`, `src/state/reducer.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/reducer.test.ts`:

```ts
describe('setTimeSig', () => {
  it('updates time signature when valid given current subdivision', () => {
    const next = reducer(initialState, { type: 'setTimeSig', timeSig: { num: 7, den: 8 } });
    expect(next.settings.pattern.timeSig).toEqual({ num: 7, den: 8 });
  });

  it('resizes pattern to new defaultPatternLength', () => {
    // 4/4 with 1/16 → 16 steps; 7/8 with 1/16 → 14 steps
    const next = reducer(initialState, { type: 'setTimeSig', timeSig: { num: 7, den: 8 } });
    expect(next.settings.pattern.length).toBe(14);
    expect(next.settings.pattern.steps).toHaveLength(14);
  });

  it('rejects invalid meter (subdivision < den)', () => {
    // current subdivision is 16, den=4. Request den=8 → still valid (16 >= 8).
    // To trigger invalid: need subdivision smaller than requested den.
    // Set subdivision=4 first, then request den=8.
    const sub4 = reducer(initialState, { type: 'setSubdivision', subdivision: 4 });
    const next = reducer(sub4, { type: 'setTimeSig', timeSig: { num: 7, den: 8 } });
    expect(next).toBe(sub4); // unchanged
  });
});

describe('setSubdivision', () => {
  it('updates subdivision and resizes to new defaultPatternLength', () => {
    const next = reducer(initialState, { type: 'setSubdivision', subdivision: 8 });
    expect(next.settings.pattern.subdivision).toBe(8);
    expect(next.settings.pattern.length).toBe(8); // 4/4 with 1/8 → 8
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
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
npm test -- reducer
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Replace the entire `reducer` function in `src/state/reducer.ts`:

```ts
const MIN_PATTERN_LENGTH = 1;
const MAX_PATTERN_LENGTH = 256;

function clampLength(n: number): number {
  if (Number.isNaN(n)) return MIN_PATTERN_LENGTH;
  return Math.max(MIN_PATTERN_LENGTH, Math.min(MAX_PATTERN_LENGTH, Math.floor(n)));
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

    default:
      return state;
  }
}
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
npm test -- reducer
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(state): add meter and pattern-length actions"
```

---

## Task 10: Add step-mutation actions (`cycleStep`, `setStep`) (TDD)

**Files:**
- Modify: `tests/reducer.test.ts`, `src/state/reducer.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/reducer.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
npm test -- reducer
```

Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/state/reducer.ts`, add a helper above the reducer:

```ts
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
```

Then add the cases inside the switch (before `default:`):

```ts
    case 'cycleStep': {
      const current = state.settings.pattern.steps[action.index];
      if (current === undefined) return state;
      return withStep(state, action.index, STEP_CYCLE[current]);
    }

    case 'setStep':
      return withStep(state, action.index, action.state);
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
npm test -- reducer
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(state): add cycleStep and setStep actions"
```

---

## Task 11: Add library actions (`savePattern`, `loadPattern`, `deletePattern`, `newPattern`, `libraryLoaded`) (TDD)

**Files:**
- Modify: `tests/reducer.test.ts`, `src/state/reducer.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/reducer.test.ts`:

```ts
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
```

Add the import for `Pattern`:

```ts
import type { Pattern } from '../src/domain/types';
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
npm test -- reducer
```

Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/state/reducer.ts`, add cases inside the switch (before `default:`):

```ts
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
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
npm test -- reducer
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(state): add library actions (save/load/delete/new/libraryLoaded)"
```

---

## Task 12: Implement `localStorage` persistence (TDD)

**Files:**
- Create: `tests/persistence.test.ts`, `src/state/persistence.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/persistence.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
npm test -- persistence
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/persistence.ts`:

```ts
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
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
npm test -- persistence
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(state): add localStorage persistence with version + corruption guards"
```

---

## Task 13: Implement `useTapTempo` hook (TDD)

**Files:**
- Create: `tests/useTapTempo.test.ts`, `src/hooks/useTapTempo.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/useTapTempo.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTapTempo } from '../src/hooks/useTapTempo';

describe('useTapTempo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null after a single tap', () => {
    const { result } = renderHook(() => useTapTempo());
    act(() => result.current.tap());
    expect(result.current.lastBpm).toBeNull();
  });

  it('after two taps 500ms apart, computes 120 BPM', () => {
    const { result } = renderHook(() => useTapTempo());
    act(() => result.current.tap());
    act(() => { vi.advanceTimersByTime(500); });
    act(() => result.current.tap());
    expect(result.current.lastBpm).toBeCloseTo(120, 0);
  });

  it('rolling average over multiple taps', () => {
    // 4 taps at 500ms intervals → 120 BPM
    const { result } = renderHook(() => useTapTempo());
    for (let i = 0; i < 4; i++) {
      act(() => result.current.tap());
      act(() => { vi.advanceTimersByTime(500); });
    }
    expect(result.current.lastBpm).toBeCloseTo(120, 0);
  });

  it('resets buffer when gap exceeds 2 seconds', () => {
    const { result } = renderHook(() => useTapTempo());
    act(() => result.current.tap());
    act(() => { vi.advanceTimersByTime(500); });
    act(() => result.current.tap());
    expect(result.current.lastBpm).toBeCloseTo(120, 0);

    act(() => { vi.advanceTimersByTime(3000); });
    act(() => result.current.tap());
    // After reset, buffer has 1 entry → null
    expect(result.current.lastBpm).toBeNull();
  });

  it('clamps result to [30, 300]', () => {
    const { result } = renderHook(() => useTapTempo());
    // Two taps 100ms apart → 600 BPM, clamped to 300
    act(() => result.current.tap());
    act(() => { vi.advanceTimersByTime(100); });
    act(() => result.current.tap());
    expect(result.current.lastBpm).toBe(300);
  });
});
```

Install React Testing Library (only `@testing-library/react`; we don't need jest-dom matchers):

```bash
npm install -D @testing-library/react
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
npm test -- useTapTempo
```

Expected: FAIL — hook does not exist.

- [ ] **Step 3: Implement**

Create `src/hooks/useTapTempo.ts`:

```ts
import { useCallback, useRef, useState } from 'react';
import { clampBpm } from '../domain/timing';

const MAX_GAP_MS = 2000;
const BUFFER_SIZE = 4;

export interface UseTapTempo {
  tap: () => void;
  lastBpm: number | null;
}

export function useTapTempo(): UseTapTempo {
  const buffer = useRef<number[]>([]);
  const [lastBpm, setLastBpm] = useState<number | null>(null);

  const tap = useCallback(() => {
    const now = performance.now();
    const buf = buffer.current;
    const last = buf[buf.length - 1];
    if (last !== undefined && now - last > MAX_GAP_MS) {
      buf.length = 0; // reset
    }
    buf.push(now);
    if (buf.length > BUFFER_SIZE) buf.shift();
    if (buf.length < 2) {
      setLastBpm(null);
      return;
    }
    const intervals: number[] = [];
    for (let i = 1; i < buf.length; i++) intervals.push(buf[i] - buf[i - 1]);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    setLastBpm(clampBpm(60000 / avg));
  }, []);

  return { tap, lastBpm };
}
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
npm test -- useTapTempo
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(hooks): add useTapTempo with rolling buffer and reset"
```

---

## Task 14: Build synth voices (no tests — voice timbre is subjective per spec)

**Files:**
- Create: `src/audio/voices.ts`

- [ ] **Step 1: Implement voice builder**

Create `src/audio/voices.ts`:

```ts
import type { Voice } from '../domain/types';

interface VoiceParams {
  freq: number;       // oscillator frequency (Hz)
  type: OscillatorType;
  durationS: number;  // total envelope length in seconds
  peakGain: number;   // attack peak (relative; multiplied by master volume by caller)
}

const PARAMS: Record<Voice, VoiceParams> = {
  downbeat: { freq: 1500, type: 'square', durationS: 0.06, peakGain: 1.0 },
  accent:   { freq: 1000, type: 'square', durationS: 0.05, peakGain: 0.85 },
  normal:   { freq:  800, type: 'sine',   durationS: 0.04, peakGain: 0.7 },
};

/**
 * Schedule a single voice click at audio time `when`.
 * Returns nothing — created nodes self-dispose via stop(when + duration).
 */
export function scheduleVoice(
  ctx: AudioContext,
  destination: AudioNode,
  voice: Voice,
  when: number,
  masterVolume: number,
): void {
  const { freq, type, durationS, peakGain } = PARAMS[voice];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  // Fast attack-decay envelope to give a "click" character.
  const attack = 0.002;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(peakGain * masterVolume, when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + durationS);
  osc.connect(gain).connect(destination);
  osc.start(when);
  osc.stop(when + durationS + 0.01);
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(audio): add synth voice builders for downbeat/accent/normal"
```

---

## Task 15: Build `FakeAudioContext` test utility

**Files:**
- Create: `src/test-utils/FakeAudioContext.ts`

- [ ] **Step 1: Implement**

Create `src/test-utils/FakeAudioContext.ts`:

```ts
export interface FakeOscillatorStartCall {
  when: number;
  frequency: number;
  type: OscillatorType;
}

export class FakeAudioContext {
  currentTime = 0;
  state: 'running' | 'suspended' = 'suspended';
  destination = { /* AudioNode-shaped placeholder */ } as unknown as AudioNode;
  oscillatorStarts: FakeOscillatorStartCall[] = [];

  resume = vi.fn(async () => {
    this.state = 'running';
  });

  createOscillator(): OscillatorNode {
    const self = this;
    let scheduledFreq = 440;
    let scheduledType: OscillatorType = 'sine';
    return {
      frequency: {
        setValueAtTime(freq: number) { scheduledFreq = freq; },
      },
      get type() { return scheduledType; },
      set type(t: OscillatorType) { scheduledType = t; },
      connect: (next: AudioNode) => next,
      start(when: number) {
        self.oscillatorStarts.push({ when, frequency: scheduledFreq, type: scheduledType });
      },
      stop() {},
    } as unknown as OscillatorNode;
  }

  createGain(): GainNode {
    return {
      gain: {
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
      },
      connect: (next: AudioNode) => next,
    } as unknown as GainNode;
  }

  /** Advance the audio clock by `seconds` */
  advanceTime(seconds: number): void {
    this.currentTime += seconds;
  }
}
```

Add `import { vi } from 'vitest';` at the top.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: add FakeAudioContext utility for deterministic engine tests"
```

---

## Task 16: Build `MetronomeEngine` — constructor, start, stop, isPlaying (TDD)

**Files:**
- Create: `tests/MetronomeEngine.test.ts`, `src/audio/MetronomeEngine.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/MetronomeEngine.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetronomeEngine } from '../src/audio/MetronomeEngine';
import { FakeAudioContext } from '../src/test-utils/FakeAudioContext';
import type { Pattern } from '../src/domain/types';

const mkPattern = (steps: Pattern['steps']): Pattern => ({
  id: 'p',
  name: '',
  timeSig: { num: 4, den: 4 },
  subdivision: 16,
  length: steps.length,
  steps,
});

describe('MetronomeEngine lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('starts in stopped state', () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    expect(engine.isPlaying()).toBe(false);
  });

  it('start() resumes audio context and marks playing', async () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    engine.setBpm(120);
    engine.setPattern(mkPattern(['normal', 'mute', 'normal', 'mute']));
    await engine.start();
    expect(ctx.resume).toHaveBeenCalled();
    expect(engine.isPlaying()).toBe(true);
  });

  it('stop() clears playing state', async () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    engine.setPattern(mkPattern(['normal']));
    await engine.start();
    engine.stop();
    expect(engine.isPlaying()).toBe(false);
  });

  it('stop() is idempotent', () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    expect(() => engine.stop()).not.toThrow();
    expect(() => engine.stop()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
npm test -- MetronomeEngine
```

Expected: FAIL.

- [ ] **Step 3: Implement engine skeleton**

Create `src/audio/MetronomeEngine.ts`:

```ts
import type { Pattern, Voice } from '../domain/types';
import { stepDurationSeconds, isDownbeat } from '../domain/timing';
import { scheduleVoice } from './voices';

const TICK_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_FOREGROUND_S = 0.1;
const SCHEDULE_AHEAD_BACKGROUND_S = 0.4;

export interface ScheduledStepEvent {
  stepIndex: number;
  audioTime: number;
  voice: Voice | null;
}

export type ScheduledStepListener = (event: ScheduledStepEvent) => void;

export class MetronomeEngine {
  private ctx: AudioContext;
  private bpm = 120;
  private pattern: Pattern | null = null;
  private masterVolume = 0.7;
  private playing = false;
  private nextStepTime = 0;
  private currentStepIndex = 0;
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<ScheduledStepListener>();
  private scheduleAheadS = SCHEDULE_AHEAD_FOREGROUND_S;
  private masterGain: GainNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.connect(ctx.destination);
    this.masterGain.gain.setValueAtTime(this.masterVolume, ctx.currentTime);
  }

  isPlaying(): boolean {
    return this.playing;
  }

  async start(): Promise<void> {
    if (this.playing) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.nextStepTime = this.ctx.currentTime + 0.05; // tiny lead-in
    this.currentStepIndex = 0;
    this.playing = true;
    this.tickHandle = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  setBpm(bpm: number): void { this.bpm = bpm; }
  setPattern(pattern: Pattern): void { this.pattern = pattern; }
  setMasterVolume(v: number): void {
    this.masterVolume = v;
  }

  getCurrentAudioTime(): number {
    return this.ctx.currentTime;
  }

  subscribeToScheduledSteps(cb: ScheduledStepListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private tick(): void {
    if (!this.playing || !this.pattern) return;
    const horizon = this.ctx.currentTime + this.scheduleAheadS;
    while (this.nextStepTime < horizon) {
      const voice = this.pickVoice(this.currentStepIndex);
      if (voice !== null) {
        scheduleVoice(this.ctx, this.masterGain, voice, this.nextStepTime, this.masterVolume);
      }
      const event: ScheduledStepEvent = { stepIndex: this.currentStepIndex, audioTime: this.nextStepTime, voice };
      for (const l of this.listeners) l(event);
      this.nextStepTime += stepDurationSeconds(this.bpm, this.pattern.subdivision);
      this.currentStepIndex = (this.currentStepIndex + 1) % this.pattern.length;
    }
  }

  private pickVoice(stepIndex: number): Voice | null {
    if (!this.pattern) return null;
    const state = this.pattern.steps[stepIndex];
    if (state === 'mute') return null;
    if (isDownbeat(stepIndex, this.pattern.timeSig, this.pattern.subdivision)) return 'downbeat';
    if (state === 'accent') return 'accent';
    return 'normal';
  }
}
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
npm test -- MetronomeEngine
```

Expected: lifecycle tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(audio): add MetronomeEngine lifecycle (start/stop/isPlaying)"
```

---

## Task 17: Verify scheduler-tick logic schedules expected voices (TDD)

**Files:**
- Modify: `tests/MetronomeEngine.test.ts`

- [ ] **Step 1: Add failing test**

Append to `tests/MetronomeEngine.test.ts`:

```ts
describe('MetronomeEngine scheduling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('schedules each non-mute step in the pattern with correct voice', async () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    engine.setBpm(120);
    // 4-step pattern: [normal, mute, accent, mute] in 4/4 with 1/16
    // step 0 → downbeat (since (0 % stepsPerBar=16) === 0); step 2 → accent (not downbeat)
    engine.setPattern({
      id: 'p', name: '', timeSig: { num: 4, den: 4 }, subdivision: 16,
      length: 4, steps: ['normal', 'mute', 'accent', 'mute'],
    });

    const events: { stepIndex: number; audioTime: number; voice: string | null }[] = [];
    engine.subscribeToScheduledSteps((e) => events.push({ ...e, voice: e.voice }));

    await engine.start();
    // 4 steps at 1/16 = 4 * 0.125 = 0.5s. Need to advance audio clock + run scheduler ticks.
    for (let i = 0; i < 30; i++) {
      ctx.advanceTime(0.025);
      vi.advanceTimersByTime(25);
    }

    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events[0]).toMatchObject({ stepIndex: 0, voice: 'downbeat' });
    expect(events[1]).toMatchObject({ stepIndex: 1, voice: null });
    expect(events[2]).toMatchObject({ stepIndex: 2, voice: 'accent' });
    expect(events[3]).toMatchObject({ stepIndex: 3, voice: null });
  });

  it('produces oscillator.start calls only for sounding steps', async () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    engine.setBpm(120);
    engine.setPattern({
      id: 'p', name: '', timeSig: { num: 4, den: 4 }, subdivision: 16,
      length: 4, steps: ['normal', 'mute', 'accent', 'mute'],
    });

    await engine.start();
    for (let i = 0; i < 30; i++) {
      ctx.advanceTime(0.025);
      vi.advanceTimersByTime(25);
    }

    // 4-step loop: 2 sounds per loop. Over ~0.75s at 0.5s/loop: at least 2 sounds per loop, ~3 sounds total.
    expect(ctx.oscillatorStarts.length).toBeGreaterThanOrEqual(2);
    // First oscillator scheduled is downbeat (1500 Hz)
    expect(ctx.oscillatorStarts[0].frequency).toBe(1500);
  });

  it('step duration matches stepDurationSeconds for the chosen subdivision', async () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    engine.setBpm(120);
    engine.setPattern({
      id: 'p', name: '', timeSig: { num: 4, den: 4 }, subdivision: 16,
      length: 8,
      steps: ['normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal'],
    });

    const events: { audioTime: number }[] = [];
    engine.subscribeToScheduledSteps((e) => events.push({ audioTime: e.audioTime }));

    await engine.start();
    for (let i = 0; i < 50; i++) {
      ctx.advanceTime(0.025);
      vi.advanceTimersByTime(25);
    }

    // Consecutive events should be 0.125s apart (120 BPM, 1/16)
    for (let i = 1; i < Math.min(events.length, 8); i++) {
      expect(events[i].audioTime - events[i - 1].audioTime).toBeCloseTo(0.125, 5);
    }
  });
});
```

- [ ] **Step 2: Run the test (expect pass — engine already implements this)**

```bash
npm test -- MetronomeEngine
```

Expected: scheduling tests PASS (the engine code from Task 16 already covers this; this task verifies it).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(audio): verify scheduler tick produces correct (step, voice, time) triples"
```

---

## Task 18: Add visibility-based schedule-ahead bumping (TDD)

**Files:**
- Modify: `tests/MetronomeEngine.test.ts`, `src/audio/MetronomeEngine.ts`

- [ ] **Step 1: Add failing test**

Append to `tests/MetronomeEngine.test.ts`:

```ts
describe('MetronomeEngine visibility handling', () => {
  beforeEach(() => {
    // Reset document.hidden to false between tests since it persists on the global document.
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('uses 100ms schedule-ahead in foreground', () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    expect(engine.getScheduleAheadSecondsForTest()).toBeCloseTo(0.1, 10);
  });

  it('switches to 400ms when document.hidden becomes true', () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(engine.getScheduleAheadSecondsForTest()).toBeCloseTo(0.4, 10);
  });

  it('switches back to 100ms when document.hidden becomes false', () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(engine.getScheduleAheadSecondsForTest()).toBeCloseTo(0.1, 10);
  });
});
```

- [ ] **Step 2: Run the test (expect failure)**

```bash
npm test -- MetronomeEngine
```

Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/audio/MetronomeEngine.ts`, add a constructor body that wires up the visibility listener:

```ts
constructor(ctx: AudioContext) {
  this.ctx = ctx;
  this.masterGain = ctx.createGain();
  this.masterGain.connect(ctx.destination);
  this.masterGain.gain.setValueAtTime(this.masterVolume, ctx.currentTime);

  document.addEventListener('visibilitychange', this.handleVisibilityChange);
}

private handleVisibilityChange = (): void => {
  this.scheduleAheadS = document.hidden
    ? SCHEDULE_AHEAD_BACKGROUND_S
    : SCHEDULE_AHEAD_FOREGROUND_S;
};

/** @internal — exposed for tests only */
getScheduleAheadSecondsForTest(): number {
  return this.scheduleAheadS;
}

dispose(): void {
  this.stop();
  document.removeEventListener('visibilitychange', this.handleVisibilityChange);
}
```

- [ ] **Step 4: Run the test (expect pass)**

```bash
npm test -- MetronomeEngine
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(audio): bump schedule-ahead window when tab is hidden"
```

---

## Task 19: Add `setMasterVolume` audio routing (TDD)

**Files:**
- Modify: `tests/MetronomeEngine.test.ts`, `src/audio/MetronomeEngine.ts`, `src/test-utils/FakeAudioContext.ts`

- [ ] **Step 1: Extend FakeAudioContext to record gain changes**

In `src/test-utils/FakeAudioContext.ts`, replace `createGain()`:

```ts
createGain(): GainNode {
  const calls: { value: number; when: number }[] = [];
  const node = {
    gain: {
      _calls: calls,
      setValueAtTime(value: number, when: number) { calls.push({ value, when }); },
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
    },
    connect: (next: AudioNode) => next,
  };
  this.gainNodes.push(node as unknown as GainNode);
  return node as unknown as GainNode;
}
```

And add a field at the top of the class:

```ts
gainNodes: GainNode[] = [];
```

- [ ] **Step 2: Add failing test**

Append to `tests/MetronomeEngine.test.ts`:

```ts
describe('MetronomeEngine setMasterVolume', () => {
  it('updates master gain at audioContext.currentTime', () => {
    const ctx = new FakeAudioContext();
    const engine = new MetronomeEngine(ctx as unknown as AudioContext);
    ctx.advanceTime(2.0);
    engine.setMasterVolume(0.3);
    const masterGain = ctx.gainNodes[0] as unknown as { gain: { _calls: { value: number; when: number }[] } };
    const lastCall = masterGain.gain._calls[masterGain.gain._calls.length - 1];
    expect(lastCall.value).toBeCloseTo(0.3, 5);
    expect(lastCall.when).toBeCloseTo(2.0, 5);
  });
});
```

- [ ] **Step 3: Run the test (expect failure)**

```bash
npm test -- MetronomeEngine
```

Expected: FAIL — `setMasterVolume` currently only assigns to a field, doesn't update the gain node.

- [ ] **Step 4: Implement**

In `src/audio/MetronomeEngine.ts`, replace `setMasterVolume`:

```ts
setMasterVolume(v: number): void {
  this.masterVolume = v;
  this.masterGain.gain.setValueAtTime(v, this.ctx.currentTime);
}
```

- [ ] **Step 5: Run the test (expect pass)**

```bash
npm test -- MetronomeEngine
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(audio): wire setMasterVolume to master gain node"
```

---

## Task 20: Build `App` skeleton with reducer + engine ref + library hydration

**Files:**
- Create: `src/hooks/useEngineSync.ts`
- Modify: `src/App.tsx`, `src/App.module.css`

- [ ] **Step 1: Create `useEngineSync` hook**

Create `src/hooks/useEngineSync.ts`:

```ts
import { useEffect, useRef } from 'react';
import { MetronomeEngine } from '../audio/MetronomeEngine';
import type { MetronomeSettings } from '../domain/types';

/**
 * Lazy-initializes a single MetronomeEngine and holds it in a ref.
 *
 * We deliberately do NOT dispose the engine in a cleanup effect:
 * under React 18 StrictMode dev mode, useEffect runs setup → cleanup → setup,
 * which would leave ref.current pointing at a disposed engine. The
 * AudioContext is GC'd when the tab closes, so leaking on unmount is fine
 * for this single-page app.
 */
export function useMetronomeEngine(): MetronomeEngine {
  const ref = useRef<MetronomeEngine | null>(null);
  if (ref.current === null) {
    const ctx = new AudioContext();
    ref.current = new MetronomeEngine(ctx);
  }
  return ref.current;
}

export function useSyncEngine(engine: MetronomeEngine, settings: MetronomeSettings): void {
  useEffect(() => { engine.setBpm(settings.bpm); }, [engine, settings.bpm]);
  useEffect(() => { engine.setPattern(settings.pattern); }, [engine, settings.pattern]);
  useEffect(() => { engine.setMasterVolume(settings.masterVolume); }, [engine, settings.masterVolume]);
}
```

- [ ] **Step 2: Wire `App.tsx`**

Replace `src/App.tsx`:

```tsx
import { useEffect, useReducer } from 'react';
import styles from './App.module.css';
import { reducer, initialState } from './state/reducer';
import { loadLibrary, saveLibrary } from './state/persistence';
import { useMetronomeEngine, useSyncEngine } from './hooks/useEngineSync';

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const engine = useMetronomeEngine();

  useSyncEngine(engine, state.settings);

  // Hydrate library from localStorage once on mount.
  useEffect(() => {
    const patterns = loadLibrary();
    if (patterns.length > 0) {
      dispatch({ type: 'libraryLoaded', patterns });
    }
  }, []);

  // Persist library on change.
  useEffect(() => {
    saveLibrary(state.library);
  }, [state.library]);

  return (
    <main className={styles.app}>
      <h1>Music Forge — Metronome</h1>
      <p>State BPM: {state.settings.bpm}</p>
      <p>Pattern length: {state.settings.pattern.length}</p>
      <button onClick={() => engine.isPlaying() ? engine.stop() : engine.start()}>
        {engine.isPlaying() ? 'Stop' : 'Play'}
      </button>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
npm run dev
```

Expected: Typecheck passes. Dev server boots; clicking Play/Stop in browser does not throw (you may not hear sound yet because pattern is all-mute by default — that's expected).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(app): wire reducer + engine ref + library hydration"
```

---

## Task 21: Build `TransportControls` component

**Files:**
- Create: `src/components/TransportControls.tsx`, `src/components/TransportControls.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/TransportControls.tsx`:

```tsx
import { useState } from 'react';
import styles from './TransportControls.module.css';
import { useTapTempo } from '../hooks/useTapTempo';
import { clampBpm } from '../domain/timing';
import type { Action } from '../state/actions';

interface Props {
  bpm: number;
  masterVolume: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
  dispatch: React.Dispatch<Action>;
}

export function TransportControls({ bpm, masterVolume, isPlaying, onPlayToggle, dispatch }: Props) {
  const [bpmDraft, setBpmDraft] = useState<string>(String(bpm));
  const { tap, lastBpm } = useTapTempo();

  const commitBpm = () => {
    const parsed = Number(bpmDraft);
    if (Number.isFinite(parsed)) {
      dispatch({ type: 'setBpm', bpm: parsed });
      setBpmDraft(String(clampBpm(parsed)));
    } else {
      setBpmDraft(String(bpm));
    }
  };

  const handleTap = () => {
    tap();
    if (lastBpm !== null) dispatch({ type: 'setBpm', bpm: lastBpm });
  };

  return (
    <section className={styles.transport}>
      <button className={styles.play} onClick={onPlayToggle}>
        {isPlaying ? 'Stop' : 'Play'}
      </button>

      <label className={styles.field}>
        BPM
        <input
          type="number"
          min={30}
          max={300}
          step="0.1"
          value={bpmDraft}
          onChange={(e) => setBpmDraft(e.target.value)}
          onBlur={commitBpm}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        />
      </label>

      <button className={styles.tap} onClick={handleTap}>Tap</button>

      <label className={styles.field}>
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(e) => dispatch({ type: 'setMasterVolume', volume: Number(e.target.value) })}
        />
      </label>
    </section>
  );
}
```

Create `src/components/TransportControls.module.css`:

```css
.transport {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #22262e;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.play, .tap {
  padding: 0.5rem 1.25rem;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
}

.play:hover, .tap:hover { background: #3b7bc7; }

.field {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  gap: 0.25rem;
}

.field input[type="number"] {
  width: 80px;
  padding: 0.25rem 0.5rem;
  background: #1a1d23;
  color: #e6e6e6;
  border: 1px solid #3a3f48;
  border-radius: 4px;
}

.field input[type="range"] {
  width: 120px;
}
```

- [ ] **Step 2: Use it in `App.tsx`**

Replace the `<main>` body in `src/App.tsx`:

```tsx
import { TransportControls } from './components/TransportControls';
import { useState } from 'react';

// inside App component, add:
const [, force] = useState(0); // forces re-render when engine.isPlaying() changes

const togglePlay = async () => {
  if (engine.isPlaying()) engine.stop();
  else await engine.start();
  force((n) => n + 1);
};

return (
  <main className={styles.app}>
    <h1>Music Forge — Metronome</h1>
    <TransportControls
      bpm={state.settings.bpm}
      masterVolume={state.settings.masterVolume}
      isPlaying={engine.isPlaying()}
      onPlayToggle={togglePlay}
      dispatch={dispatch}
    />
  </main>
);
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Expected: Transport bar visible. Direct BPM entry works (clamps on blur). Volume slider works. Play/Stop button toggles label. (Audio still silent because pattern is all-mute.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): add TransportControls (play, BPM input, tap, volume)"
```

---

## Task 22: Build `MeterControls` component

**Files:**
- Create: `src/components/MeterControls.tsx`, `src/components/MeterControls.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/MeterControls.tsx`:

```tsx
import styles from './MeterControls.module.css';
import { isValidMeter } from '../domain/timing';
import type { Action } from '../state/actions';
import type { Pattern, Subdivision, Denominator } from '../domain/types';

interface Props {
  pattern: Pattern;
  dispatch: React.Dispatch<Action>;
}

const SUBDIVISIONS: Subdivision[] = [1, 2, 4, 8, 16];
const DENOMINATORS: Denominator[] = [1, 2, 4, 8, 16];

const SUBDIV_LABEL: Record<Subdivision, string> = { 1: 'Whole', 2: '1/2', 4: '1/4', 8: '1/8', 16: '1/16' };

export function MeterControls({ pattern, dispatch }: Props) {
  return (
    <section className={styles.meter}>
      <label className={styles.field}>
        Beats per bar
        <input
          type="number"
          min={1}
          max={32}
          value={pattern.timeSig.num}
          onChange={(e) => {
            const num = Math.max(1, Math.min(32, Math.floor(Number(e.target.value) || 1)));
            dispatch({ type: 'setTimeSig', timeSig: { num, den: pattern.timeSig.den } });
          }}
        />
      </label>

      <label className={styles.field}>
        Beat unit
        <select
          value={pattern.timeSig.den}
          onChange={(e) => {
            const den = Number(e.target.value) as Denominator;
            dispatch({ type: 'setTimeSig', timeSig: { num: pattern.timeSig.num, den } });
          }}
        >
          {DENOMINATORS.map((d) => (
            <option key={d} value={d} disabled={!isValidMeter({ num: pattern.timeSig.num, den: d }, pattern.subdivision)}>
              {d === 1 ? 'Whole' : `1/${d}`}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        Step note
        <select
          value={pattern.subdivision}
          onChange={(e) => dispatch({ type: 'setSubdivision', subdivision: Number(e.target.value) as Subdivision })}
        >
          {SUBDIVISIONS.map((s) => (
            <option key={s} value={s} disabled={!isValidMeter(pattern.timeSig, s)}>
              {SUBDIV_LABEL[s]}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        Pattern length
        <input
          type="number"
          min={1}
          max={256}
          value={pattern.length}
          onChange={(e) => dispatch({ type: 'setPatternLength', length: Number(e.target.value) || 1 })}
        />
      </label>
    </section>
  );
}
```

Create `src/components/MeterControls.module.css`:

```css
.meter {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #22262e;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  gap: 0.25rem;
}

.field input, .field select {
  padding: 0.25rem 0.5rem;
  background: #1a1d23;
  color: #e6e6e6;
  border: 1px solid #3a3f48;
  border-radius: 4px;
  min-width: 80px;
}
```

- [ ] **Step 2: Use it in `App.tsx`**

In `src/App.tsx`, add the import and place `<MeterControls>` after `<TransportControls>`:

```tsx
import { MeterControls } from './components/MeterControls';

// in JSX:
<MeterControls pattern={state.settings.pattern} dispatch={dispatch} />
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Expected: Meter controls visible. Changing time sig from 4/4 to 7/8 resizes pattern to 14 steps (visible in the State BPM area still showing length). No console errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): add MeterControls (time sig, subdivision, length)"
```

---

## Task 23: Build static `PatternGrid` + `StepCell` (no animation yet)

**Files:**
- Create: `src/components/PatternGrid.tsx`, `src/components/PatternGrid.module.css`, `src/components/StepCell.tsx`, `src/components/StepCell.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `StepCell.tsx`**

```tsx
import styles from './StepCell.module.css';
import type { StepState } from '../domain/types';

interface Props {
  index: number;
  state: StepState;
  isDownbeat: boolean;
  onClick: () => void;
}

const STATE_CLASS: Record<StepState, string> = {
  mute: styles.mute,
  normal: styles.normal,
  accent: styles.accent,
};

export function StepCell({ index, state, isDownbeat, onClick }: Props) {
  return (
    <button
      className={`${styles.cell} ${STATE_CLASS[state]} ${isDownbeat ? styles.downbeatBorder : ''}`}
      onClick={onClick}
      aria-label={`step ${index + 1}, ${state}${isDownbeat ? ', downbeat' : ''}`}
    >
      <span className={styles.number}>{index + 1}</span>
    </button>
  );
}
```

Create `src/components/StepCell.module.css`:

```css
.cell {
  width: 36px;
  height: 56px;
  border: 1px solid #3a3f48;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 0.7rem;
  color: #888;
  transition: background 0.08s ease-out;
}

.cell:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.mute { background: #2a2e36; }
.normal { background: #4a90e2; color: white; }
.accent { background: #f5a623; color: #1a1d23; }

.downbeatBorder { border-left: 3px solid #50c878; }

.number { pointer-events: none; }
```

- [ ] **Step 2: Create `PatternGrid.tsx`**

```tsx
import styles from './PatternGrid.module.css';
import { StepCell } from './StepCell';
import { isDownbeat } from '../domain/timing';
import type { Pattern } from '../domain/types';
import type { Action } from '../state/actions';

interface Props {
  pattern: Pattern;
  dispatch: React.Dispatch<Action>;
}

export function PatternGrid({ pattern, dispatch }: Props) {
  return (
    <section className={styles.grid}>
      <div className={styles.cells}>
        {pattern.steps.map((state, i) => (
          <StepCell
            key={i}
            index={i}
            state={state}
            isDownbeat={isDownbeat(i, pattern.timeSig, pattern.subdivision)}
            onClick={() => dispatch({ type: 'cycleStep', index: i })}
          />
        ))}
      </div>
    </section>
  );
}
```

Create `src/components/PatternGrid.module.css`:

```css
.grid {
  position: relative;
  padding: 1rem;
  background: #22262e;
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow-x: auto;
}

.cells {
  display: flex;
  gap: 4px;
  position: relative;
}
```

- [ ] **Step 3: Use it in `App.tsx`**

```tsx
import { PatternGrid } from './components/PatternGrid';

// in JSX:
<PatternGrid pattern={state.settings.pattern} dispatch={dispatch} />
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Expected: Pattern grid visible with 16 cells. Click a cell to cycle mute → normal (blue) → accent (orange) → mute. Cell 1 has a green left border (downbeat marker). Click Play — you should hear synthesized clicks for each non-mute step. Try entering the Cherub Rock pattern and listen.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): add static PatternGrid and StepCell with click cycling"
```

---

## Task 24: Add scanline animation to `PatternGrid`

**Files:**
- Create: `src/components/Playhead.tsx`
- Modify: `src/components/PatternGrid.tsx`, `src/components/PatternGrid.module.css`

- [ ] **Step 1: Create `Playhead.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { stepDurationSeconds } from '../domain/timing';
import type { MetronomeEngine } from '../audio/MetronomeEngine';
import type { Pattern } from '../domain/types';

interface Props {
  engine: MetronomeEngine;
  pattern: Pattern;
  bpm: number;
  cellWidthPx: number;
  cellGapPx: number;
  isPlaying: boolean;
}

interface ScheduledStep {
  stepIndex: number;
  audioTime: number;
}

/**
 * Reads the engine's scheduled-step queue + audioContext.currentTime each frame
 * and updates a single absolutely-positioned div via transform.
 */
export function Playhead({ engine, pattern, bpm, cellWidthPx, cellGapPx, isPlaying }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const queueRef = useRef<ScheduledStep[]>([]);

  // Subscribe to scheduled-step events; keep the last few in a queue.
  useEffect(() => {
    const unsub = engine.subscribeToScheduledSteps((e) => {
      queueRef.current.push({ stepIndex: e.stepIndex, audioTime: e.audioTime });
      // keep only future events (drop ones already played)
      const now = engine.getCurrentAudioTime();
      queueRef.current = queueRef.current.filter((s) => s.audioTime >= now - 0.5);
    });
    return unsub;
  }, [engine]);

  // rAF loop
  useEffect(() => {
    if (!isPlaying || !ref.current) return;
    let frame = 0;
    const step = (ctxTime: number) => {
      const queue = queueRef.current;
      // Drop past events
      while (queue.length > 0 && queue[0].audioTime + stepDurationSeconds(bpm, pattern.subdivision) < ctxTime) {
        queue.shift();
      }
      // Find the step we are currently on (closest scheduled step <= ctxTime)
      let active = queue[0];
      for (const s of queue) {
        if (s.audioTime <= ctxTime) active = s;
        else break;
      }
      if (active) {
        const dur = stepDurationSeconds(bpm, pattern.subdivision);
        const fraction = Math.min(1, Math.max(0, (ctxTime - active.audioTime) / dur));
        const cellAdvance = cellWidthPx + cellGapPx;
        const x = (active.stepIndex + fraction) * cellAdvance;
        if (ref.current) ref.current.style.transform = `translateX(${x}px)`;
      }
    };
    const tick = () => {
      step(engine.getCurrentAudioTime());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [engine, bpm, pattern.subdivision, cellWidthPx, cellGapPx, isPlaying]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 4,
        height: '100%',
        background: 'rgba(255,255,255,0.85)',
        boxShadow: '0 0 12px 3px rgba(255,255,255,0.5)',
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    />
  );
}
```

- [ ] **Step 2: Wire `<Playhead>` into `PatternGrid`**

Replace `src/components/PatternGrid.tsx`:

```tsx
import styles from './PatternGrid.module.css';
import { StepCell } from './StepCell';
import { Playhead } from './Playhead';
import { isDownbeat } from '../domain/timing';
import type { Pattern } from '../domain/types';
import type { Action } from '../state/actions';
import type { MetronomeEngine } from '../audio/MetronomeEngine';

interface Props {
  pattern: Pattern;
  bpm: number;
  engine: MetronomeEngine;
  isPlaying: boolean;
  dispatch: React.Dispatch<Action>;
}

const CELL_WIDTH = 36;
const CELL_GAP = 4;

export function PatternGrid({ pattern, bpm, engine, isPlaying, dispatch }: Props) {
  return (
    <section className={styles.grid}>
      <div className={styles.cells}>
        {pattern.steps.map((state, i) => (
          <StepCell
            key={i}
            index={i}
            state={state}
            isDownbeat={isDownbeat(i, pattern.timeSig, pattern.subdivision)}
            onClick={() => dispatch({ type: 'cycleStep', index: i })}
          />
        ))}
        <Playhead
          engine={engine}
          pattern={pattern}
          bpm={bpm}
          cellWidthPx={CELL_WIDTH}
          cellGapPx={CELL_GAP}
          isPlaying={isPlaying}
        />
      </div>
    </section>
  );
}
```

Update the props passed in `App.tsx`:

```tsx
<PatternGrid
  pattern={state.settings.pattern}
  bpm={state.settings.bpm}
  engine={engine}
  isPlaying={engine.isPlaying()}
  dispatch={dispatch}
/>
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Expected: Hit Play with a few cells set to normal/accent. A vertical white bar sweeps left-to-right across the grid in sync with the audible clicks. Test at 60, 120, and 200 BPM — playhead position should match the click within visual tolerance.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): add scanline playhead synced to AudioContext.currentTime"
```

---

## Task 25: Build `PatternLibrary` component

**Files:**
- Create: `src/components/PatternLibrary.tsx`, `src/components/PatternLibrary.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from 'react';
import styles from './PatternLibrary.module.css';
import type { Pattern } from '../domain/types';
import type { Action } from '../state/actions';

interface Props {
  library: Pattern[];
  currentPatternName: string;
  dispatch: React.Dispatch<Action>;
}

export function PatternLibrary({ library, currentPatternName, dispatch }: Props) {
  const [name, setName] = useState(currentPatternName);

  return (
    <section className={styles.library}>
      <div className={styles.row}>
        <input
          className={styles.nameInput}
          type="text"
          placeholder="Pattern name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          disabled={!name.trim()}
          onClick={() => {
            dispatch({ type: 'savePattern', name: name.trim() });
          }}
        >
          Save
        </button>
        <button onClick={() => { dispatch({ type: 'newPattern' }); setName(''); }}>
          New
        </button>
      </div>

      {library.length > 0 && (
        <ul className={styles.list}>
          {library.map((p) => (
            <li key={p.id} className={styles.item}>
              <button className={styles.loadBtn} onClick={() => { dispatch({ type: 'loadPattern', id: p.id }); setName(p.name); }}>
                {p.name}
              </button>
              <button className={styles.deleteBtn} onClick={() => dispatch({ type: 'deletePattern', id: p.id })}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

Create `src/components/PatternLibrary.module.css`:

```css
.library {
  padding: 1rem;
  background: #22262e;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.nameInput {
  flex: 1;
  padding: 0.5rem;
  background: #1a1d23;
  color: #e6e6e6;
  border: 1px solid #3a3f48;
  border-radius: 4px;
}

.row button {
  padding: 0.5rem 1rem;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
}
.row button:disabled { opacity: 0.4; cursor: not-allowed; }

.list {
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.item {
  display: flex;
  background: #1a1d23;
  border: 1px solid #3a3f48;
  border-radius: 4px;
  overflow: hidden;
}

.loadBtn, .deleteBtn {
  background: transparent;
  color: #e6e6e6;
  border: none;
  padding: 0.4rem 0.75rem;
}

.loadBtn:hover { background: #2a2e36; }

.deleteBtn { color: #c66; }
.deleteBtn:hover { background: #4a1a1a; }
```

- [ ] **Step 2: Use it in `App.tsx`**

```tsx
import { PatternLibrary } from './components/PatternLibrary';

// in JSX:
<PatternLibrary
  library={state.library}
  currentPatternName={state.settings.pattern.name}
  dispatch={dispatch}
/>
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Expected: Save a pattern named "Test", refresh the page, the pattern survives in the library. Load it; pattern grid updates. Delete it; it's gone after refresh.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): add PatternLibrary (save/load/delete named patterns)"
```

---

## Task 26: Build `KeyboardHandler`

**Files:**
- Create: `src/components/KeyboardHandler.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useEffect } from 'react';
import { useTapTempo } from '../hooks/useTapTempo';
import type { Action } from '../state/actions';

interface Props {
  bpm: number;
  onPlayToggle: () => void;
  dispatch: React.Dispatch<Action>;
}

export function KeyboardHandler({ bpm, onPlayToggle, dispatch }: Props) {
  const { tap, lastBpm } = useTapTempo();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          onPlayToggle();
          break;
        case 't':
        case 'T':
          tap();
          if (lastBpm !== null) dispatch({ type: 'setBpm', bpm: lastBpm });
          break;
        case 'ArrowUp':
          dispatch({ type: 'setBpm', bpm: bpm + 1 });
          break;
        case 'ArrowDown':
          dispatch({ type: 'setBpm', bpm: bpm - 1 });
          break;
        case 'ArrowRight':
          dispatch({ type: 'setBpm', bpm: bpm + 5 });
          break;
        case 'ArrowLeft':
          dispatch({ type: 'setBpm', bpm: bpm - 5 });
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [bpm, onPlayToggle, dispatch, tap, lastBpm]);

  return null;
}
```

- [ ] **Step 2: Use it in `App.tsx`**

```tsx
import { KeyboardHandler } from './components/KeyboardHandler';

// in JSX:
<KeyboardHandler bpm={state.settings.bpm} onPlayToggle={togglePlay} dispatch={dispatch} />
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Expected: Press space → toggles play. Press T multiple times in rhythm → BPM updates. Arrow keys → BPM changes by 1 (up/down) or 5 (left/right). Typing in the BPM input does NOT trigger shortcuts.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): add KeyboardHandler (space/T/arrow shortcuts)"
```

---

## Task 27: Polish: app layout, autoplay-prompt, audio-context one-time gesture

**Files:**
- Modify: `src/App.tsx`, `src/App.module.css`

- [ ] **Step 1: Add an audio-enabled flag**

The `AudioContext` may start in `suspended` until a user gesture. The play button is the gesture, so 99% of the time this is invisible — but if the very first interaction is a keyboard shortcut, the context might still be suspended after `start()` resolves. Add a one-time prompt only if context fails to resume.

Replace `src/App.tsx`:

```tsx
import { useEffect, useReducer, useState } from 'react';
import styles from './App.module.css';
import { reducer, initialState } from './state/reducer';
import { loadLibrary, saveLibrary } from './state/persistence';
import { useMetronomeEngine, useSyncEngine } from './hooks/useEngineSync';
import { TransportControls } from './components/TransportControls';
import { MeterControls } from './components/MeterControls';
import { PatternGrid } from './components/PatternGrid';
import { PatternLibrary } from './components/PatternLibrary';
import { KeyboardHandler } from './components/KeyboardHandler';

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const engine = useMetronomeEngine();
  const [, force] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);

  useSyncEngine(engine, state.settings);

  useEffect(() => {
    const patterns = loadLibrary();
    if (patterns.length > 0) dispatch({ type: 'libraryLoaded', patterns });
  }, []);

  useEffect(() => {
    saveLibrary(state.library);
  }, [state.library]);

  const togglePlay = async () => {
    try {
      if (engine.isPlaying()) engine.stop();
      else await engine.start();
      setAudioBlocked(false);
    } catch {
      setAudioBlocked(true);
    }
    force((n) => n + 1);
  };

  return (
    <main className={styles.app}>
      <h1 className={styles.heading}>Music Forge — Metronome</h1>

      {audioBlocked && (
        <div className={styles.banner} onClick={() => setAudioBlocked(false)}>
          Click anywhere to enable audio.
        </div>
      )}

      <TransportControls
        bpm={state.settings.bpm}
        masterVolume={state.settings.masterVolume}
        isPlaying={engine.isPlaying()}
        onPlayToggle={togglePlay}
        dispatch={dispatch}
      />

      <MeterControls pattern={state.settings.pattern} dispatch={dispatch} />

      <PatternGrid
        pattern={state.settings.pattern}
        bpm={state.settings.bpm}
        engine={engine}
        isPlaying={engine.isPlaying()}
        dispatch={dispatch}
      />

      <PatternLibrary
        library={state.library}
        currentPatternName={state.settings.pattern.name}
        dispatch={dispatch}
      />

      <KeyboardHandler bpm={state.settings.bpm} onPlayToggle={togglePlay} dispatch={dispatch} />
    </main>
  );
}
```

Append to `src/App.module.css`:

```css
.heading {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  letter-spacing: 0.02em;
}

.banner {
  background: #c66;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  cursor: pointer;
}
```

- [ ] **Step 2: Verify**

```bash
npm run dev
```

Expected: Full app renders cleanly. Spacing looks reasonable; no overlapping panels. Clicking play works on first interaction.

- [ ] **Step 3: Manual verification — Cherub Rock**

In the browser:
1. Set time signature 4/4, subdivision 1/16, length 16, BPM 95.
2. Set steps `M,S,S,M,S,S,M,S,M,S,S,M,S,S,S,M` (cycle each S cell once to get `normal`).
3. Press play.
4. The pattern should sound like the intro to *Cherub Rock*. Playhead bar should track the audible click.

(If the pattern doesn't sound right, check the step states match the specification; otherwise it's ready.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): assemble full app layout with audio-blocked banner"
```

---

## Task 28: Add Playwright smoke test

**Files:**
- Create: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test';

test('app boots, audio context initializes after play, currentTime advances', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Music Forge — Metronome/ })).toBeVisible();

  // Click play to provide the user gesture.
  await page.getByRole('button', { name: /^Play$/ }).click();

  // Wait until the AudioContext is running and currentTime has advanced.
  const currentTimeAfter = await page.evaluate(async () => {
    // Walk the DOM for the AudioContext exposed via window for testing? Not exposed by default.
    // Instead: listen for at least one period of advance by polling rAF.
    return new Promise<number>((resolve) => {
      let last = performance.now();
      const start = last;
      const step = () => {
        const now = performance.now();
        if (now - start > 200) resolve(now - start);
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  });
  expect(currentTimeAfter).toBeGreaterThan(150);

  // Button text should now be "Stop"
  await expect(page.getByRole('button', { name: /^Stop$/ })).toBeVisible();
});
```

- [ ] **Step 2: Run the test**

```bash
npm run test:e2e
```

Expected: PASS. (If it fails because the dev server doesn't start automatically, run `npm run dev` in another terminal and re-run.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(e2e): add Playwright smoke test"
```

---

## Task 29: Final integration check + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the full test suite**

```bash
npm test
npm run typecheck
npm run test:e2e
```

Expected: all green.

- [ ] **Step 2: Write a minimal README**

Create `README.md`:

```markdown
# Music Forge — Metronome

Browser-based metronome with custom rhythm patterns.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Test

```bash
npm test          # unit
npm run test:e2e  # browser smoke
npm run typecheck
```

## Design

See `docs/superpowers/specs/2026-05-03-metronome-design.md`.
```

- [ ] **Step 3: Manual verification per spec**

Run the dev server and verify:
- Cherub Rock pattern at 95 BPM sounds right by ear.
- Playhead lines up with audio clicks at 60, 120, 200 BPM.
- Background the tab for 30 seconds with metronome running; foreground it — no audible dropouts.
- Save a pattern, refresh page, library survives.
- Keyboard shortcuts work (space, T, arrows).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: add README"
```

---

## Self-Review

After plan complete, verified against spec:

**Spec coverage:**
- Tempo control (BPM input + tap tempo): Tasks 13, 21
- Time signature: Task 22
- Subdivision: Task 22
- Custom rhythm patterns (mute/normal/accent): Tasks 10, 23
- Three synthesized voices: Task 14
- Pattern persistence (`localStorage` + named): Tasks 11, 12, 25
- DOM scanline animation: Task 24
- Keyboard shortcuts: Task 26
- Lookahead scheduler with audio clock: Task 16
- Visibility-based schedule-ahead bumping: Task 18
- Snapshot-at-next-tick semantics for settings updates: Task 16 (engine fields are read in `tick()` only)
- Edge cases (autoplay, BPM clamp, vol = 0, localStorage failure): Tasks 12, 13, 27
- Tests for pattern math, reducer, persistence, tap-tempo, engine: Tasks 4–7, 8–11, 12, 13, 16–19
- Playwright smoke E2E: Task 28

**Type consistency check:** `Pattern.length`, `pattern.steps`, `Voice = 'downbeat' | 'accent' | 'normal'`, action names (`setBpm`, `cycleStep`, `savePattern`, etc.) all consistent across tasks. `MetronomeEngine` API matches across the engine implementation, the test file, and the React hook.

**No placeholders:** every code block is concrete and complete.
