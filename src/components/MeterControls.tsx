import styles from './MeterControls.module.css';
import { isValidMeter } from '../domain/timing';
import type { Action } from '../state/actions';
import type { Pattern, Subdivision, Denominator } from '../domain/types';

interface Props {
  pattern: Pattern;
  dispatch: React.Dispatch<Action>;
}

const SUBDIVISIONS: Subdivision[] = [1, 2, 4, 8, 16];
const DENOMINATORS: Denominator[] = [1, 2, 4, 8, 16];

const SUBDIV_LABEL: Record<Subdivision, string> = { 1: 'Whole', 2: '1/2', 4: '1/4', 8: '1/8', 16: '1/16' };

export function MeterControls({ pattern, dispatch }: Props) {
  return (
    <section className={styles.meter}>
      <label className={styles.field}>
        Beats per bar
        <input
          type="number"
          min={1}
          max={32}
          value={pattern.timeSig.num}
          onChange={(e) => {
            const num = Math.max(1, Math.min(32, Math.floor(Number(e.target.value) || 1)));
            dispatch({ type: 'setTimeSig', timeSig: { num, den: pattern.timeSig.den } });
          }}
        />
      </label>

      <label className={styles.field}>
        Beat unit
        <select
          value={pattern.timeSig.den}
          onChange={(e) => {
            const den = Number(e.target.value) as Denominator;
            dispatch({ type: 'setTimeSig', timeSig: { num: pattern.timeSig.num, den } });
          }}
        >
          {DENOMINATORS.map((d) => (
            <option key={d} value={d} disabled={!isValidMeter({ num: pattern.timeSig.num, den: d }, pattern.subdivision)}>
              {d === 1 ? 'Whole' : `1/${d}`}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        Step note
        <select
          value={pattern.subdivision}
          onChange={(e) => dispatch({ type: 'setSubdivision', subdivision: Number(e.target.value) as Subdivision })}
        >
          {SUBDIVISIONS.map((s) => (
            <option key={s} value={s} disabled={!isValidMeter(pattern.timeSig, s)}>
              {SUBDIV_LABEL[s]}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        Pattern length
        <input
          type="number"
          min={1}
          max={256}
          value={pattern.length}
          onChange={(e) => dispatch({ type: 'setPatternLength', length: Number(e.target.value) || 1 })}
        />
      </label>
    </section>
  );
}
