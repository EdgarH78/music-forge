import { useEffect, useRef } from 'react';
import { stepDurationSeconds } from '../domain/timing';
import type { MetronomeEngine } from '../audio/MetronomeEngine';
import type { Pattern } from '../domain/types';

interface Props {
  engine: MetronomeEngine;
  pattern: Pattern;
  bpm: number;
  cellWidthPx: number;
  cellGapPx: number;
  isPlaying: boolean;
}

interface ScheduledStep {
  stepIndex: number;
  audioTime: number;
}

/**
 * Reads the engine's scheduled-step queue + audioContext.currentTime each frame
 * and updates a single absolutely-positioned div via transform.
 */
export function Playhead({ engine, pattern, bpm, cellWidthPx, cellGapPx, isPlaying }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const queueRef = useRef<ScheduledStep[]>([]);

  // Subscribe to scheduled-step events; keep recent ones in a queue.
  useEffect(() => {
    const unsub = engine.subscribeToScheduledSteps((e) => {
      queueRef.current.push({ stepIndex: e.stepIndex, audioTime: e.audioTime });
      // keep only future events (drop ones already played)
      const now = engine.getCurrentAudioTime();
      queueRef.current = queueRef.current.filter((s) => s.audioTime >= now - 0.5);
    });
    return unsub;
  }, [engine]);

  // rAF loop
  useEffect(() => {
    if (!isPlaying || !ref.current) return;
    let frame = 0;
    const step = (ctxTime: number) => {
      const queue = queueRef.current;
      // Drop past events
      while (queue.length > 0 && queue[0].audioTime + stepDurationSeconds(bpm, pattern.subdivision) < ctxTime) {
        queue.shift();
      }
      // Find the active step (latest scheduled step whose audioTime <= ctxTime)
      let active = queue[0];
      for (const s of queue) {
        if (s.audioTime <= ctxTime) active = s;
        else break;
      }
      if (active) {
        const dur = stepDurationSeconds(bpm, pattern.subdivision);
        const fraction = Math.min(1, Math.max(0, (ctxTime - active.audioTime) / dur));
        const cellAdvance = cellWidthPx + cellGapPx;
        const x = (active.stepIndex + fraction) * cellAdvance;
        if (ref.current) ref.current.style.transform = `translateX(${x}px)`;
      }
    };
    const tick = () => {
      step(engine.getCurrentAudioTime());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [engine, bpm, pattern.subdivision, cellWidthPx, cellGapPx, isPlaying]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 4,
        height: '100%',
        background: 'rgba(255,255,255,0.85)',
        boxShadow: '0 0 12px 3px rgba(255,255,255,0.5)',
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    />
  );
}
