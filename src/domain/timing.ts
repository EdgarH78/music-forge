import type { Subdivision, TimeSig, StepState } from './types';

export function stepDurationSeconds(bpm: number, subdivision: Subdivision): number {
  return (60 / bpm) * (4 / subdivision);
}

export function stepsPerBar(timeSig: TimeSig, subdivision: Subdivision): number {
  return (timeSig.num * subdivision) / timeSig.den;
}

export function isDownbeat(stepIndex: number, timeSig: TimeSig, subdivision: Subdivision): boolean {
  return stepIndex % stepsPerBar(timeSig, subdivision) === 0;
}

export function defaultPatternLength(timeSig: TimeSig, subdivision: Subdivision): number {
  return stepsPerBar(timeSig, subdivision);
}

export function resizePattern(steps: StepState[], newLength: number): StepState[] {
  if (newLength === steps.length) return steps;
  if (newLength < steps.length) return steps.slice(0, newLength);
  const padding: StepState[] = Array(newLength - steps.length).fill('mute');
  return [...steps, ...padding];
}

export function clampBpm(bpm: number): number {
  if (Number.isNaN(bpm)) return 30;
  return Math.max(30, Math.min(300, bpm));
}

export function clampVolume(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
