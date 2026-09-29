import { describe, expect, it } from 'vitest';
import {
  angleDiff,
  chsh,
  CHSH_OPTIMAL,
  lhvCorrelation,
  lhvOutcome,
  MERMIN_ANGLES,
  MERMIN_CLASSICAL_MIN,
  MERMIN_QUANTUM,
  quantumCorrelation,
  phiPlusOutcome,
  singletOutcome,
} from './bell';
import { mulberry32 } from './rng';

function sampleE(f: typeof singletOutcome, a: number, b: number, n: number, seed: number): number {
  const rng = mulberry32(seed);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const [A, B] = f(a, b, rng);
    s += A * B;
  }
  return s / n;
}

describe('Bell correlations', () => {
  it('sampled singlet correlations follow E = −cos(a − b)', () => {
    for (const d of [0, 0.4, 1.2, Math.PI / 2, 2.5, Math.PI]) {
      const n = 40_000;
      const e = sampleE(singletOutcome, 0.3, 0.3 + d, n, 7);
      const exact = quantumCorrelation(0.3, 0.3 + d);
      expect(Math.abs(e - exact)).toBeLessThan(4 * Math.sqrt((1 - exact * exact) / n) + 1e-9);
    }
  });

  it('the hidden-variable model gives the linear E = −1 + 2|Δ|/π and agrees at 0 and π', () => {
    for (const d of [0, 0.7, Math.PI / 2, 2.2, Math.PI]) {
      const e = sampleE(lhvOutcome, 0.1, 0.1 + d, 60_000, 3);
      expect(e).toBeCloseTo(lhvCorrelation(0.1, 0.1 + d), 1);
    }
    expect(lhvCorrelation(0, 0)).toBe(quantumCorrelation(0, 0));
    expect(lhvCorrelation(0, Math.PI)).toBeCloseTo(quantumCorrelation(0, Math.PI), 12);
  });

  it('quantum mechanics reaches |S| = 2√2 at the optimal CHSH settings; sampling confirms it', () => {
    const { a, b } = CHSH_OPTIMAL;
    const exact = chsh((i, j) => quantumCorrelation(a[i], b[j]));
    expect(Math.abs(exact)).toBeCloseTo(2 * Math.SQRT2, 12);
    const n = 50_000;
    const sampled = chsh((i, j) => sampleE(singletOutcome, a[i], b[j], n, 10 * i + j + 1));
    expect(Math.abs(Math.abs(sampled) - 2 * Math.SQRT2)).toBeLessThan(4 * Math.sqrt(4 / n));
  });

  it('the hidden-variable model never exceeds the classical bound |S| ≤ 2', () => {
    const rng = mulberry32(99);
    for (let k = 0; k < 300; k++) {
      const a: [number, number] = [2 * Math.PI * rng(), 2 * Math.PI * rng()];
      const b: [number, number] = [2 * Math.PI * rng(), 2 * Math.PI * rng()];
      expect(Math.abs(chsh((i, j) => lhvCorrelation(a[i], b[j])))).toBeLessThanOrEqual(2 + 1e-12);
    }
    const { a, b } = CHSH_OPTIMAL;
    expect(Math.abs(chsh((i, j) => lhvCorrelation(a[i], b[j])))).toBeCloseTo(2, 12);
  });

  it('Mermin test: random settings give 1/2 agreement quantum-mechanically, 5/9 classically', () => {
    const rng = mulberry32(5);
    const n = 90_000;
    let q = 0;
    let c = 0;
    for (let i = 0; i < n; i++) {
      const a = MERMIN_ANGLES[Math.floor(rng() * 3)];
      const b = MERMIN_ANGLES[Math.floor(rng() * 3)];
      const [A, B] = singletOutcome(a, b, rng);
      const [A2, B2] = lhvOutcome(a, b, rng);
      if (A === -B) q++;
      if (A2 === -B2) c++;
    }
    expect(Math.abs(q / n - MERMIN_QUANTUM)).toBeLessThan(4 * Math.sqrt(0.25 / n));
    expect(Math.abs(c / n - MERMIN_CLASSICAL_MIN)).toBeLessThan(4 * Math.sqrt(0.25 / n));
  });

  it('no signalling: Alice’s results are 50/50 whatever Bob measures', () => {
    for (const b of [0, 1, 2.5]) {
      const rng = mulberry32(11);
      let plus = 0;
      const n = 40_000;
      for (let i = 0; i < n; i++) if (singletOutcome(0, b, rng)[0] === 1) plus++;
      expect(Math.abs(plus / n - 0.5)).toBeLessThan(4 * Math.sqrt(0.25 / n));
    }
  });

  it('angleDiff wraps into [0, π]', () => {
    expect(angleDiff(0, (3 * Math.PI) / 2)).toBeCloseTo(Math.PI / 2, 12);
    expect(angleDiff(-0.2, 0.2)).toBeCloseTo(0.4, 12);
  });

  it('Φ⁺ pairs: each side a fair coin, P(same) = cos²(Δ/2), always the same along one axis', () => {
    const rng = mulberry32(21);
    const n = 20_000;
    for (const d of [0, Math.PI / 3, Math.PI / 2, Math.PI]) {
      let same = 0;
      let leftZero = 0;
      for (let k = 0; k < n; k++) {
        const [A, B] = phiPlusOutcome(0.2, 0.2 + d, rng);
        if (A === B) same++;
        if (A === 0) leftZero++;
      }
      const p = Math.cos(d / 2) ** 2;
      const sigma = Math.sqrt((p * (1 - p)) / n);
      expect(Math.abs(same / n - p)).toBeLessThanOrEqual(4 * sigma + 1e-12);
      expect(Math.abs(leftZero / n - 0.5)).toBeLessThan(4 * Math.sqrt(0.25 / n));
    }
  });
});
