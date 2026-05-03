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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
