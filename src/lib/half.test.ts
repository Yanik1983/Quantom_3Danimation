import { DataUtils } from 'three';
import { describe, expect, it } from 'vitest';
import { toHalf } from './half';
import { mulberry32 } from '../physics/rng';

describe('toHalf', () => {
  it('round-trips representative values within half precision', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 20_000; i++) {
      const mag = Math.pow(10, rng() * 9 - 5); // 1e-5 … 1e4
      const v = (rng() < 0.5 ? -1 : 1) * mag;
      const back = DataUtils.fromHalfFloat(toHalf(v));
      const tol = Math.max(Math.abs(v) * 1e-3, 6e-8);
      expect(Math.abs(back - v)).toBeLessThanOrEqual(tol);
    }
  });

  it('handles special values', () => {
    expect(DataUtils.fromHalfFloat(toHalf(0))).toBe(0);
    expect(DataUtils.fromHalfFloat(toHalf(1))).toBe(1);
    expect(DataUtils.fromHalfFloat(toHalf(-2.5))).toBe(-2.5);
    expect(DataUtils.fromHalfFloat(toHalf(1e6))).toBe(Infinity);
    expect(DataUtils.fromHalfFloat(toHalf(1e-9))).toBe(0);
    expect(Number.isNaN(DataUtils.fromHalfFloat(toHalf(NaN)))).toBe(true);
    // Rounding carry into the exponent: largest value below 2 rounds up to 2.
    expect(DataUtils.fromHalfFloat(toHalf(1.99999))).toBe(2);
  });
});
