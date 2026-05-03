import { useEffect, useReducer, useState } from 'react';
import styles from './App.module.css';
import { reducer, initialState } from './state/reducer';
import { loadLibrary, saveLibrary } from './state/persistence';
import { useMetronomeEngine, useSyncEngine } from './hooks/useEngineSync';
import { TransportControls } from './components/TransportControls';
import { MeterControls } from './components/MeterControls';

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const engine = useMetronomeEngine();
  const [, force] = useState(0);

  useSyncEngine(engine, state.settings);

  useEffect(() => {
    const patterns = loadLibrary();
    if (patterns.length > 0) dispatch({ type: 'libraryLoaded', patterns });
  }, []);

  useEffect(() => {
    saveLibrary(state.library);
  }, [state.library]);

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
      <MeterControls pattern={state.settings.pattern} dispatch={dispatch} />
    </main>
  );
}
