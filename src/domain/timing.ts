import type { Subdivision, TimeSig } from './types';

export function stepDurationSeconds(bpm: number, subdivision: Subdivision): number {
  return (60 / bpm) * (4 / subdivision);
}

export function stepsPerBar(timeSig: TimeSig, subdivision: Subdivision): number {
  return (timeSig.num * subdivision) / timeSig.den;
}

export function isDownbeat(stepIndex: number, timeSig: TimeSig, subdivision: Subdivision): boolean {
  return stepIndex % stepsPerBar(timeSig, subdivision) === 0;
}
