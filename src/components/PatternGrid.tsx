import styles from './PatternGrid.module.css';
import { StepCell } from './StepCell';
import { isDownbeat } from '../domain/timing';
import type { Pattern } from '../domain/types';
import type { Action } from '../state/actions';

interface Props {
  pattern: Pattern;
  dispatch: React.Dispatch<Action>;
}

export function PatternGrid({ pattern, dispatch }: Props) {
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
      </div>
    </section>
  );
}
