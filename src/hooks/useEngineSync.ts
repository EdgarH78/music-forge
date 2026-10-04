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
