# Music Forge — Metronome

Browser-based metronome with custom rhythm patterns, three synthesized voices (downbeat / accent / normal), and a DOM-based scanline animation through an editable pattern grid. Timing via the Web Audio API lookahead-scheduler pattern.

## Modes

- **Traditional** — a plain metronome: pick the time signature and the click note (whole, 1/2, 1/4, 1/8, 1/16) and every note of that value sounds, one bar long, with the downbeat accented. The grid is read-only.
- **Custom** — the full step sequencer: any pattern length up to 256 steps, each step cycling mute → normal → accent.

Switching Traditional → Custom keeps the generated clicks as an editable starting point. Mode is saved with the pattern.

Note values coarser than the beat unit are allowed whenever they divide the bar evenly (half notes in 4/4 = 2 clicks), and disabled when they don't (whole notes in 3/4).

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5174.

## Test

```bash
npm test          # unit (Vitest)
npm run test:e2e  # browser smoke (Playwright)
npm run typecheck # tsc --noEmit
```

## Keyboard shortcuts

- **Space** — play / pause
- **T** — tap tempo
- **↑ / ↓** — BPM ± 1
- **← / →** — BPM ± 5

Shortcuts are ignored while typing in an input.

## Design

See `docs/superpowers/specs/2026-05-03-metronome-design.md` for the full design spec; `docs/superpowers/plans/2026-05-03-metronome.md` for the implementation plan.

## Manual verification

- Cherub Rock pattern (M,S,S,M,S,S,M,S,M,S,S,M,S,S,S,M) at ~95 BPM should "sound right" by ear.
- Playhead visually lines up with the audible click at 60, 120, and 200 BPM.
- Tab backgrounding survives 30 seconds without audible dropouts.
- Saved patterns persist across page reloads.
