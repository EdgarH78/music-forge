import styles from './StepCell.module.css';
import type { StepState } from '../domain/types';

interface Props {
  index: number;
  state: StepState;
  isDownbeat: boolean;
  readOnly?: boolean;
  onClick: () => void;
}

const STATE_CLASS: Record<StepState, string> = {
  mute: styles.mute,
  normal: styles.normal,
  accent: styles.accent,
};

export function StepCell({ index, state, isDownbeat, readOnly = false, onClick }: Props) {
  return (
    <button
      className={`${styles.cell} ${STATE_CLASS[state]} ${isDownbeat ? styles.downbeatBorder : ''} ${readOnly ? styles.readOnly : ''}`}
      onClick={onClick}
      disabled={readOnly}
      aria-label={`step ${index + 1}, ${state}${isDownbeat ? ', downbeat' : ''}`}
    >
      <span className={styles.number}>{index + 1}</span>
    </button>
  );
}
