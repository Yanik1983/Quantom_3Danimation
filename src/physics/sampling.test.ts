import { describe, expect, it } from 'vitest';
import { AliasTable, cumulative } from './sampling';
import { gaussian, mulberry32 } from './rng';

describe('AliasTable', () => {
  it('reproduces the target distribution (chi-square test)', () => {
    const w = [0.1, 0.4, 0.05, 0.25, 0.2];
    const t = new AliasTable(w);
    const rng = mulberry32(42);
    const N = 200_000;
    const counts = new Array(w.length).fill(0);
    for (let i = 0; i < N; i++) counts[t.sample(rng)]++;
    let chi2 = 0;
    for (let i = 0; i < w.length; i++) {
      const e = w[i] * N;
      chi2 += (counts[i] - e) ** 2 / e;
    }
    // 4 degrees of freedom: p = 0.001 critical value is 18.47
    expect(chi2).toBeLessThan(18.47);
  });

  it('never samples zero-probability outcomes', () => {
    const t = new AliasTable([0, 3, 0, 1, 0]);
    const rng = mulberry32(1);
    for (let i = 0; i < 10_000; i++) expect([1, 3]).toContain(t.sample(rng));
  });

  it('accepts unnormalized weights and rejects invalid ones', () => {
    expect(() => new AliasTable([])).toThrow();
    expect(() => new AliasTable([0, 0])).toThrow();
    expect(() => new AliasTable([1, -1])).toThrow();
    expect(() => new AliasTable([1, NaN])).toThrow();
    expect(new AliasTable([5, 5]).n).toBe(2);
  });
});

describe('cumulative', () => {
  it('ends at exactly 1', () => {
    const c = cumulative([1, 2, 3, 4]);
    expect(Array.from(c)).toEqual([0.1, 0.3, 0.6, 1]);
  });
});

describe('rng', () => {
  it('is deterministic for a seed and uniform on [0,1)', () => {
    const a = mulberry32(9);
    const b = mulberry32(9);
    let mean = 0;
    for (let i = 0; i < 50_000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      mean += x;
    }
    expect(mean / 50_000).toBeCloseTo(0.5, 2);
  });

  it('gaussian() has mean 0 and variance 1', () => {
    const rng = mulberry32(123);
    const N = 100_000;
    let s = 0;
    let s2 = 0;
    for (let i = 0; i < N; i++) {
      const g = gaussian(rng);
      s += g;
      s2 += g * g;
    }
    expect(s / N).toBeCloseTo(0, 1);
    expect(s2 / N).toBeCloseTo(1, 1);
  });
});
