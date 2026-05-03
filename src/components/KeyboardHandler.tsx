import { useEffect } from 'react';
import { useTapTempo } from '../hooks/useTapTempo';
import type { Action } from '../state/actions';

interface Props {
  bpm: number;
  onPlayToggle: () => void;
  dispatch: React.Dispatch<Action>;
}

export function KeyboardHandler({ bpm, onPlayToggle, dispatch }: Props) {
  const { tap, lastBpm } = useTapTempo();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          onPlayToggle();
          break;
        case 't':
        case 'T':
          tap();
          if (lastBpm !== null) dispatch({ type: 'setBpm', bpm: lastBpm });
          break;
        case 'ArrowUp':
          dispatch({ type: 'setBpm', bpm: bpm + 1 });
          break;
        case 'ArrowDown':
          dispatch({ type: 'setBpm', bpm: bpm - 1 });
          break;
        case 'ArrowRight':
          dispatch({ type: 'setBpm', bpm: bpm + 5 });
          break;
        case 'ArrowLeft':
          dispatch({ type: 'setBpm', bpm: bpm - 5 });
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [bpm, onPlayToggle, dispatch, tap, lastBpm]);

  return null;
}
