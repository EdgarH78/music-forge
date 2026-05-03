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
