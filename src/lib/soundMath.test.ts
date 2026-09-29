import { describe, expect, it } from 'vitest';
import { RateLimiter, resultFrequency } from './soundMath';

describe('sound helpers', () => {
  it('maps 0 low and 1 high, two octaves apart', () => {
    const low = resultFrequency(0, 2);
    const high = resultFrequency(1, 2);
    expect(low).toBeCloseTo(329.63, 2);
    expect(high / low).toBeCloseTo(4, 6);
  });

  it('gives rising pitches for larger results', () => {
    for (const count of [4, 8, 16]) {
      let prev = 0;
      for (let i = 0; i < count; i++) {
        const f = resultFrequency(i, count);
        expect(f).toBeGreaterThanOrEqual(prev);
        prev = f;
      }
    }
  });

  it('rate-limits events', () => {
    const r = new RateLimiter(0.05);
    expect(r.allow(0)).toBe(true);
    expect(r.allow(0.02)).toBe(false);
    expect(r.allow(0.06)).toBe(true);
  });
});
