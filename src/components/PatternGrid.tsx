import styles from './PatternGrid.module.css';
import { StepCell } from './StepCell';
import { Playhead } from './Playhead';
import { isDownbeat } from '../domain/timing';
import { SUBDIV_NOTE_NAME } from '../domain/labels';
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
  const traditional = pattern.mode === 'traditional';

  return (
    <section className={styles.grid}>
      {traditional && (
        <p className={styles.hint}>
          Clicking every {SUBDIV_NOTE_NAME[pattern.subdivision]} note, downbeat accented. Switch to
          Custom to edit individual steps.
        </p>
      )}
      <div className={styles.cells}>
        {pattern.steps.map((state, i) => (
          <StepCell
            key={i}
            index={i}
            state={state}
            isDownbeat={isDownbeat(i, pattern.timeSig, pattern.subdivision)}
            readOnly={traditional}
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
