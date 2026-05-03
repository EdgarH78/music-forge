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
