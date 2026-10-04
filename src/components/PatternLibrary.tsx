import { useState } from 'react';
import styles from './PatternLibrary.module.css';
import type { Pattern } from '../domain/types';
import type { Action } from '../state/actions';

interface Props {
  library: Pattern[];
  currentPatternName: string;
  dispatch: React.Dispatch<Action>;
}

export function PatternLibrary({ library, currentPatternName, dispatch }: Props) {
  const [name, setName] = useState(currentPatternName);

  return (
    <section className={styles.library}>
      <div className={styles.row}>
        <input
          className={styles.nameInput}
          type="text"
          placeholder="Pattern name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          disabled={!name.trim()}
          onClick={() => {
            dispatch({ type: 'savePattern', name: name.trim() });
          }}
        >
          Save
        </button>
        <button onClick={() => { dispatch({ type: 'newPattern' }); setName(''); }}>
          New
        </button>
      </div>

      {library.length > 0 && (
        <ul className={styles.list}>
          {library.map((p) => (
            <li key={p.id} className={styles.item}>
              <button className={styles.loadBtn} onClick={() => { dispatch({ type: 'loadPattern', id: p.id }); setName(p.name); }}>
                {p.name}
              </button>
              <button className={styles.deleteBtn} onClick={() => dispatch({ type: 'deletePattern', id: p.id })}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
