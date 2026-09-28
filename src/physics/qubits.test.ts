import { describe, expect, it } from 'vitest';
import { amplitudes, abs2 } from './bloch';
import { bitsToIndex, measureAll, productDistribution, thetaForP1 } from './qubits';
import { mulberry32 } from './rng';

describe('qubits', () => {
  it('thetaForP1 inverts sin²(θ/2) and matches the Bloch amplitudes', () => {
    for (const p of [0, 0.1, 0.5, 0.83, 1]) {
      const [a, b] = amplitudes({ theta: thetaForP1(p), phi: 0.7 });
      expect(abs2(b)).toBeCloseTo(p, 12);
      expect(abs2(a)).toBeCloseTo(1 - p, 12);
    }
  });

  it('product distribution is normalized and has 2ⁿ entries', () => {
    for (let n = 1; n <= 4; n++) {
      const d = productDistribution(n, 0.3);
      expect(d.length).toBe(2 ** n);
      expect(d.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
    }
  });

  it('an even mix makes all 2ⁿ outcomes equally likely', () => {
    const d = productDistribution(3, 0.5);
    for (const p of d) expect(p).toBeCloseTo(1 / 8, 12);
  });

  it('orders bit strings with qubit 0 most significant', () => {
    const d = productDistribution(2, 0.2); // |00⟩ .64, |01⟩ .16, |10⟩ .16, |11⟩ .04
    [0.64, 0.16, 0.16, 0.04].forEach((p, i) => expect(d[i]).toBeCloseTo(p, 12));
    const d3 = productDistribution(3, 0.9);
    expect(d3[0b011]).toBeCloseTo(0.1 * 0.9 * 0.9, 12);
    expect(bitsToIndex([1, 0])).toBe(2);
    expect(bitsToIndex([0, 1, 1])).toBe(3);
  });

  it('measurement frequencies follow the Born rule (4σ)', () => {
    const rng = mulberry32(5);
    const n = 3;
    const p1 = 0.3;
    const trials = 40_000;
    const counts = new Float64Array(8);
    for (let t = 0; t < trials; t++) counts[bitsToIndex(measureAll(n, p1, rng))]++;
    const d = productDistribution(n, p1);
    for (let s = 0; s < 8; s++) {
      const sigma = Math.sqrt((d[s] * (1 - d[s])) / trials);
      expect(Math.abs(counts[s] / trials - d[s])).toBeLessThan(4 * sigma);
    }
  });

  it('definite states always give the same answer', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      expect(measureAll(4, 0, rng)).toEqual([0, 0, 0, 0]);
      expect(measureAll(2, 1, rng)).toEqual([1, 1]);
    }
  });
});
