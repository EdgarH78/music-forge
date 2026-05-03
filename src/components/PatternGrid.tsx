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
