# Music Forge — Metronome

Browser-based metronome with custom rhythm patterns, three synthesized voices (downbeat / accent / normal), and a DOM-based scanline animation through an editable pattern grid. Timing via the Web Audio API lookahead-scheduler pattern.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 (or 5174 if 5173 is in use).

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
