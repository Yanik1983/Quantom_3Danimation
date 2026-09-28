import { describe, expect, it } from 'vitest';
import {
  abs2,
  amplitudes,
  basisAmplitudes,
  blochVector,
  eigenstate,
  fromVector,
  measure,
  probabilityPlus,
  type Basis,
} from './bloch';
import { mulberry32 } from './rng';

const bases: Basis[] = ['z', 'x', 'y'];
const states = [
  { theta: 0, phi: 0 },
  { theta: Math.PI, phi: 0 },
  { theta: 1.1, phi: 0.4 },
  { theta: 2.3, phi: 4.1 },
  { theta: Math.PI / 2, phi: Math.PI / 2 },
];

describe('qubit', () => {
  it('is normalized and has a unit Bloch vector', () => {
    for (const q of states) {
      const [a, b] = amplitudes(q);
      expect(abs2(a) + abs2(b)).toBeCloseTo(1, 14);
      const r = blochVector(q);
      expect(Math.hypot(...r)).toBeCloseTo(1, 14);
    }
  });

  it('Born probabilities from amplitudes equal ½(1 ± r·n) in every basis', () => {
    for (const q of states) {
      for (const basis of bases) {
        const [p, m] = basisAmplitudes(q, basis);
        expect(abs2(p) + abs2(m)).toBeCloseTo(1, 14);
        expect(abs2(p)).toBeCloseTo(probabilityPlus(q, basis), 14);
      }
    }
  });

  it('eigenstates point along ± the measurement axis and are certain', () => {
    for (const basis of bases) {
      expect(probabilityPlus(eigenstate(basis, true), basis)).toBeCloseTo(1, 14);
      expect(probabilityPlus(eigenstate(basis, false), basis)).toBeCloseTo(0, 14);
    }
    expect(blochVector(eigenstate('y', true))[1]).toBeCloseTo(1, 14);
  });

  it('sampled outcomes match the Born probability within 4σ', () => {
    const rng = mulberry32(99);
    const q = { theta: 1.1, phi: 0.4 };
    const n = 100_000;
    for (const basis of bases) {
      let plus = 0;
      for (let i = 0; i < n; i++) if (measure(q, basis, rng).plus) plus++;
      const p = probabilityPlus(q, basis);
      expect(Math.abs(plus / n - p)).toBeLessThan(4 * Math.sqrt((p * (1 - p)) / n));
    }
  });

  it('repeating a measurement gives the same result; a complementary one is 50/50', () => {
    const rng = mulberry32(5);
    const first = measure({ theta: 1.9, phi: 2.2 }, 'z', rng);
    for (let i = 0; i < 100; i++) expect(measure(first.after, 'z', rng).plus).toBe(first.plus);
    expect(probabilityPlus(first.after, 'x')).toBeCloseTo(0.5, 14);
    expect(probabilityPlus(first.after, 'y')).toBeCloseTo(0.5, 14);
  });

  it('round-trips between angles and Bloch vectors', () => {
    for (const q of states.slice(2)) {
      const back = fromVector(...blochVector(q));
      expect(back.theta).toBeCloseTo(q.theta, 12);
      expect(back.phi).toBeCloseTo(q.phi, 12);
    }
  });
});
