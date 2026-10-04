import { useCallback, useRef, useState } from 'react';
import { clampBpm } from '../domain/timing';

const MAX_GAP_MS = 2000;
const BUFFER_SIZE = 4;

export interface UseTapTempo {
  tap: () => void;
  lastBpm: number | null;
}

export function useTapTempo(): UseTapTempo {
  const buffer = useRef<number[]>([]);
  const [lastBpm, setLastBpm] = useState<number | null>(null);

  const tap = useCallback(() => {
    const now = performance.now();
    const buf = buffer.current;
    const last = buf[buf.length - 1];
    if (last !== undefined && now - last > MAX_GAP_MS) {
      buf.length = 0; // reset
    }
    buf.push(now);
    if (buf.length > BUFFER_SIZE) buf.shift();
    if (buf.length < 2) {
      setLastBpm(null);
      return;
    }
    const intervals: number[] = [];
    for (let i = 1; i < buf.length; i++) intervals.push(buf[i] - buf[i - 1]);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    setLastBpm(clampBpm(60000 / avg));
  }, []);

  return { tap, lastBpm };
}
