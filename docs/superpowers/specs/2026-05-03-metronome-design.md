# Metronome — Design Spec

**Date:** 2026-05-03
**Status:** Approved (brainstorming complete)

## Purpose

A browser-based metronome focused on **rhythm-pattern dialing-in**. Beyond the standard tempo-and-tick metronome, the user can specify exactly which subdivision steps sound and which are muted, then loop the pattern to internalize and refine it (e.g., the intro to *Cherub Rock*).

Timing must be sample-accurate and stay correct under JS-thread stalls and tab backgrounding. Built with React for the UI and the Web Audio API for sound; no `setTimeout`/`setInterval` for audio scheduling itself.

## Scope

### In v1

- Tempo control: numeric BPM input, tap tempo, master volume
- Time signature: any `num/den` where `den ∈ {1, 2, 4, 8, 16}`
- Subdivision per step: whole, 1/2, 1/4, 1/8, 1/16
- Custom rhythm patterns: free length, per-step state of `mute | normal | accent`
- Three synthesized voices: downbeat (auto-fired on bar position 1), accent, normal
- Pattern persistence in `localStorage` with named save/load/delete
- Horizontal scanline animation through an editable pattern grid (one combined UI element)
- Keyboard shortcuts: `space` (play/pause), `T` (tap), arrow keys (BPM ±)

### Out of v1

Pattern export/import as JSON; tempo presets (Largo/Andante/etc.); count-in bars; sample-based voices; multiple voice/sample packs; pendulum animation; MIDI sync; multi-tab AudioContext sharing; AudioWorklet-based scheduling; sample-rate switching.

## Architectural Decisions

### Pattern model: free length + meter overlay

A pattern is an arbitrary-length list of step states. The user sets pattern `length` directly; it defaults to `(num/den) × subdivision` from the time signature but is freely editable. Time signature controls *which* steps land on the downbeat (every Nth step gets the downbeat sound when sounding).

**Why:** Supports the Cherub Rock 16-step example, odd time signatures (7/8, 5/4), and multi-bar phrases without forcing the user into a time-signature box. Bar-locked or pure-step-loop alternatives were rejected because each fails one of those cases.

### Sound source: synthesized v1

Voices built from `OscillatorNode` + `GainNode` envelope per click. No bundled audio assets. **Why:** Zero startup cost, sample-accurate timing identical to a sampled approach, trivial to swap to `AudioBufferSourceNode` later if a sample-based voice pack is added.

### Audio scheduling: lookahead scheduler ("A Tale of Two Clocks" pattern)

A `setInterval` scheduler tick runs every **25ms**. On each tick, it walks forward in pattern time and uses `oscillator.start(when)` (where `when` is in `AudioContext.currentTime` seconds) to schedule every step that falls inside the schedule-ahead window `[currentAudioTime, currentAudioTime + scheduleAheadS]`. The audio clock is the single source of truth; `Date.now()` and `performance.now()` are never used for audio.

The schedule-ahead window is **100ms** in the foreground, making timing rock-solid up to a 100ms JS-thread stall. When the tab is hidden, the browser throttles `setInterval` to ~1Hz; we compensate by widening the schedule-ahead window to **400ms** so the throttled tick still has time to queue everything before the next one fires.

### State architecture: `useReducer` + non-React engine class

A `MetronomeEngine` class (plain TypeScript, owns the `AudioContext` and the scheduler) is held in a `useRef` and never re-instantiated across renders. UI state lives in a `useReducer`. A single `useEffect` pushes the relevant settings subset into the engine on change. Audio code never participates in React's render cycle.

### Animation: DOM grid + CSS transform on the playhead

The pattern grid is real `<button>` elements (one per step). The playhead is a single absolutely-positioned `<div>` whose `transform: translateX(...)` is updated each `requestAnimationFrame` from `audioContext.currentTime`. **Why over Canvas:** pattern editing is the primary interaction — clicking cells to cycle their state. DOM gives free hit-testing, free keyboard accessibility, free screen-reader labeling ("step 4, accent"), and zero canvas math. The playhead transform is one cheap property update per frame.

## Data Model

```ts
type StepState = 'mute' | 'normal' | 'accent';

interface Pattern {
  id: string;            // uuid
  name: string;          // "Cherub Rock intro"
  timeSig: { num: number; den: 1 | 2 | 4 | 8 | 16 };
  subdivision: 1 | 2 | 4 | 8 | 16; // duration of one step (1=whole … 16=1/16)
  length: number;         // # of steps; invariant: steps.length === length
  steps: StepState[];
}

interface MetronomeSettings {
  bpm: number;            // quarter-note BPM (musical convention)
  masterVolume: number;   // 0..1
  pattern: Pattern;       // currently-loaded pattern (may be unsaved/draft)
}

interface PersistedLibrary {
  version: 1;
  patterns: Pattern[];    // saved/named patterns from localStorage
}
```

### Invariants

- `pattern.steps.length === pattern.length` always. Resize ops preserve this; growing fills with `mute`, shrinking truncates from the end.
- BPM is always quarter-note BPM. Step duration in seconds = `(60 / bpm) * (4 / subdivision)`. Example: at 120 BPM with `subdivision = 16`, each step = 0.125 s.
- **Pattern length and bar length are independent.** Bar length in steps = `stepsPerBar = num * subdivision / den` (e.g., 4/4 with subdivision 16 → 16 steps per bar; 7/8 with subdivision 16 → 14 steps per bar). Pattern length defaults to `stepsPerBar` but the user can set it freely — a 32-step pattern in 4/4 with 1/16 spans two bars and contains two downbeats; a 13-step pattern in 4/4 with 1/16 contains one downbeat and the bar grid simply doesn't repeat within the loop.
- Step `i` lands on the downbeat iff `(i % stepsPerBar) === 0`. The downbeat voice plays only if that step's state is `normal` or `accent` (never on `mute`).
- BPM clamps to `[30, 300]`. Decimal values allowed.
- `masterVolume` clamps to `[0, 1]`.

## Component Tree

```
<App>                        // owns reducer + useRef<MetronomeEngine>; wires both to children
├── <TransportControls>      // play/stop, BPM input, tap-tempo button, master volume slider
├── <MeterControls>          // time signature, subdivision, pattern length
├── <PatternGrid>            // editable pattern + scanline animation (combined element)
│   ├── <StepCell />         // <button> cycling mute → normal → accent → mute on click
│   └── <Playhead />         // absolutely-positioned <div>; transform updated via rAF
├── <PatternLibrary>         // save current as named, load saved, delete saved
└── <KeyboardHandler />      // invisible; binds space / T / arrow keys
```

### Responsibilities

- **App** owns the reducer and `useRef<MetronomeEngine>`. One `useEffect` mirrors `(bpm, pattern, masterVolume)` into the engine on change.
- **PatternGrid** is the *only* component that calls `requestAnimationFrame`. It subscribes to `engine.subscribeToScheduledSteps()` to drive the playhead position and per-step flash effects.
- **TransportControls / MeterControls / PatternLibrary / KeyboardHandler** are pure presentation. They dispatch reducer actions; they never touch the engine or `requestAnimationFrame`.

## MetronomeEngine API

```ts
class MetronomeEngine {
  constructor(audioContext: AudioContext);

  // Lifecycle
  start(): Promise<void>;   // resume audioContext if suspended, then begin scheduler tick
  stop(): void;             // clear scheduler tick; no-op if already stopped
  isPlaying(): boolean;

  // Settings — pushed by React effect; engine snapshots them at next scheduler tick
  setBpm(bpm: number): void;
  setPattern(pattern: Pattern): void;
  setMasterVolume(v: number): void;

  // Animation feed — observers receive scheduled-step events keyed by audio time
  subscribeToScheduledSteps(
    cb: (event: { stepIndex: number; audioTime: number; voice: 'downbeat' | 'accent' | 'normal' }) => void
  ): () => void;            // returns unsubscribe

  // Diagnostics
  getCurrentAudioTime(): number;
}
```

### Internal constants

- `TICK_INTERVAL_MS = 25` — `setInterval` period for the scheduler tick. (When the tab is hidden the browser throttles this to ~1 Hz; we cannot override that, so we compensate by widening the schedule-ahead window below.)
- `SCHEDULE_AHEAD_S = 0.1` foreground; `0.4` when `document.hidden` is true. This is the window into which each tick schedules audio; widening it covers the throttled-tick gap.

### Scheduler tick logic (pseudocode)

```
on every scheduler tick:
  while nextStepTime < audioContext.currentTime + scheduleAheadS:
    voice = pickVoice(currentStepIndex, pattern, timeSig, subdivision)
    if voice !== null:
      scheduleVoice(voice, nextStepTime)
    notifySubscribers(currentStepIndex, nextStepTime, voice)
    nextStepTime += stepDurationSeconds(bpm, subdivision)
    currentStepIndex = (currentStepIndex + 1) % pattern.length
```

`pickVoice` returns `'downbeat'` when the step is on bar position 0 *and* not muted; `'accent'` when state is `accent`; `'normal'` when state is `normal`; `null` when state is `mute`.

### Settings updates

Mid-play changes to BPM, pattern, time signature, subdivision, or volume take effect at the **next scheduler tick** (≤25ms). Steps already scheduled in the audio future play out at their old timing — that is correct, not a bug; you cannot un-schedule sound that has already been queued for the speakers.

## Edge Cases & Error Handling

- **Browser autoplay policy.** `AudioContext` starts `suspended` until a user gesture. `start()` calls `audioContext.resume()` first; if it rejects, surface a "Click anywhere to enable audio" prompt. The play button is the gesture, so this is invisible 99% of the time but covers the case where a keyboard shortcut is the very first interaction.
- **Tab backgrounding.** Lookahead bumped to 400ms when `document.hidden` is true; restored to 100ms on `visibilitychange → visible`.
- **rAF pause.** When the tab hides, `requestAnimationFrame` stops. That is fine — animation is purely visual. On `visibilitychange → visible`, rAF resumes; the playhead re-syncs from `audioContext.currentTime` on the first frame.
- **BPM / pattern / meter changes mid-play.** Allowed. Snapshot at next scheduler tick. `currentStepIndex` is clamped to `length - 1` if the pattern shrinks.
- **Tap tempo.** Rolling buffer of the last 4 tap timestamps (`performance.now()` is fine here). BPM = `60000 / averageInterval`. Reset buffer if the gap between two taps exceeds 2 s. Result clamped to `[30, 300]`.
- **BPM input.** Numeric input clamps to `[30, 300]` on blur, not on every keystroke. Decimal values allowed.
- **Volume = 0.** Audio still schedules; the playhead still animates. Keeps play state coherent.
- **`localStorage` failure.** Quota exceeded or private-mode disabled: `<PatternLibrary>` shows a non-blocking warning. The app still works without persistence; the current pattern just won't survive a refresh.

## Persistence

Single `localStorage` key (`musicforge.metronome.library.v1`) holds a JSON-serialized `PersistedLibrary`. Save/load/delete operations go through the reducer; the reducer writes to `localStorage` on every library mutation. On load, the library is read once at app mount; corrupt or version-mismatched data is treated as empty (no migration in v1).

The currently-loaded pattern is *not* auto-persisted as draft — only explicit save-as-named puts it in the library. This is deliberate: the in-progress pattern is throwaway scratch space until named.

## Build & Tooling

- **Vite + TypeScript + React.** Vite for dev server and build; TypeScript strict mode; React 18+ with `useReducer` and `useRef`.
- **Vitest** for unit tests.
- **Playwright** for one E2E smoke test.
- **Plain CSS modules.** No styling framework — UI is small and bespoke.

## Testing Strategy

### Unit (Vitest)

- **Pattern math.** Pure functions with known values:
  - `stepDurationSeconds(bpm, subdivision)`: `(120, 16) → 0.125`, `(60, 4) → 1.0`; decimals.
  - `barPositionOfStep(stepIndex, timeSig, subdivision)`: downbeat detection across odd time signatures (7/8, 5/4) and subdivisions.
  - `defaultPatternLength(timeSig, subdivision)`: `(4/4, 16) → 16`, `(7/8, 16) → 14`, etc.
  - Pattern resize preserves invariant; growing fills with `mute`; shrinking truncates from the end.
- **Reducer.** Every action produces correct next state; invariants hold; `localStorage` round-trips intact.
- **Tap-tempo math.** Buffer reset on long gap; clamping; rolling-average correctness.
- **Engine logic with a fake AudioContext.** Manually-driven `currentTime`; capture `OscillatorNode.start(when)` calls into a list. Drive the scheduler tick by hand. Assert exact `(stepIndex, audioTime, voice)` triples for known inputs (e.g., the Cherub Rock pattern at 95 BPM over 1 simulated second).

### Integration / E2E (Playwright, one test)

"Audio context initializes, `currentTime` advances after user clicks play, scheduler tick is hot." Verifies wiring end-to-end in a real browser. Does not assert audio-content correctness — that is the unit tests' job.

### Manual verification (documented, not automated)

- Cherub Rock pattern (`M,S,S,M,S,S,M,S,M,S,S,M,S,S,S,M`) at ~95 BPM "sounds right" by ear.
- Playhead visually lines up with the audible click at 60, 120, and 200 BPM.
- Tab backgrounding survives 30 seconds without audible dropouts.

### Not tested

- Voice timbre / sound design — subjective.
- Animation pixel positions — covered by visual spec, verified manually.
- React render performance — premature; UI is small.

## Open Questions

None. All gray areas resolved during brainstorming.
