import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTapTempo } from '../src/hooks/useTapTempo';

describe('useTapTempo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null after a single tap', () => {
    const { result } = renderHook(() => useTapTempo());
    act(() => result.current.tap());
    expect(result.current.lastBpm).toBeNull();
  });

  it('after two taps 500ms apart, computes 120 BPM', () => {
    const { result } = renderHook(() => useTapTempo());
    act(() => result.current.tap());
    act(() => { vi.advanceTimersByTime(500); });
    act(() => result.current.tap());
    expect(result.current.lastBpm).toBeCloseTo(120, 0);
  });

  it('rolling average over multiple taps', () => {
    const { result } = renderHook(() => useTapTempo());
    for (let i = 0; i < 4; i++) {
      act(() => result.current.tap());
      act(() => { vi.advanceTimersByTime(500); });
    }
    expect(result.current.lastBpm).toBeCloseTo(120, 0);
  });

  it('resets buffer when gap exceeds 2 seconds', () => {
    const { result } = renderHook(() => useTapTempo());
    act(() => result.current.tap());
    act(() => { vi.advanceTimersByTime(500); });
    act(() => result.current.tap());
    expect(result.current.lastBpm).toBeCloseTo(120, 0);

    act(() => { vi.advanceTimersByTime(3000); });
    act(() => result.current.tap());
    expect(result.current.lastBpm).toBeNull();
  });

  it('clamps result to [30, 300]', () => {
    const { result } = renderHook(() => useTapTempo());
    act(() => result.current.tap());
    act(() => { vi.advanceTimersByTime(100); });
    act(() => result.current.tap());
    expect(result.current.lastBpm).toBe(300);
  });
});
