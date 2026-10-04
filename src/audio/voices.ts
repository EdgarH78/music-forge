import type { Voice } from '../domain/types';

interface VoiceParams {
  freq: number;       // oscillator frequency (Hz)
  type: OscillatorType;
  durationS: number;  // total envelope length in seconds
  peakGain: number;   // attack peak (relative; multiplied by master volume by caller)
}

const PARAMS: Record<Voice, VoiceParams> = {
  downbeat: { freq: 1500, type: 'square', durationS: 0.06, peakGain: 1.0 },
  accent:   { freq: 1000, type: 'square', durationS: 0.05, peakGain: 0.85 },
  normal:   { freq:  800, type: 'sine',   durationS: 0.04, peakGain: 0.7 },
};

/**
 * Schedule a single voice click at audio time `when`.
 * Created nodes self-dispose via stop(when + duration).
 */
export function scheduleVoice(
  ctx: AudioContext,
  destination: AudioNode,
  voice: Voice,
  when: number,
  masterVolume: number,
): void {
  const { freq, type, durationS, peakGain } = PARAMS[voice];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  // Fast attack-decay envelope to give a "click" character.
  const attack = 0.002;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(peakGain * masterVolume, when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + durationS);
  osc.connect(gain).connect(destination);
  osc.start(when);
  osc.stop(when + durationS + 0.01);
}
