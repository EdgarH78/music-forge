import { vi } from 'vitest';

export interface FakeOscillatorStartCall {
  when: number;
  frequency: number;
  type: OscillatorType;
}

interface FakeGainCall {
  value: number;
  when: number;
}

export class FakeAudioContext {
  currentTime = 0;
  state: 'running' | 'suspended' = 'suspended';
  destination = {} as unknown as AudioNode;
  oscillatorStarts: FakeOscillatorStartCall[] = [];
  gainNodes: GainNode[] = [];

  resume = vi.fn(async () => {
    this.state = 'running';
  });

  createOscillator(): OscillatorNode {
    const self = this;
    let scheduledFreq = 440;
    let scheduledType: OscillatorType = 'sine';
    return {
      frequency: {
        setValueAtTime(freq: number) { scheduledFreq = freq; },
      },
      get type() { return scheduledType; },
      set type(t: OscillatorType) { scheduledType = t; },
      connect: (next: AudioNode) => next,
      start(when: number) {
        self.oscillatorStarts.push({ when, frequency: scheduledFreq, type: scheduledType });
      },
      stop() {},
    } as unknown as OscillatorNode;
  }

  createGain(): GainNode {
    const calls: FakeGainCall[] = [];
    const node = {
      gain: {
        _calls: calls,
        setValueAtTime(value: number, when: number) { calls.push({ value, when }); },
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
      },
      connect: (next: AudioNode) => next,
    };
    this.gainNodes.push(node as unknown as GainNode);
    return node as unknown as GainNode;
  }

  /** Advance the audio clock by `seconds` */
  advanceTime(seconds: number): void {
    this.currentTime += seconds;
  }
}
