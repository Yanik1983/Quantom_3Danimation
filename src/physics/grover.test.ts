import { describe, expect, it } from 'vitest';
import {
  diffuse,
  measureIndex,
  optimalRounds,
  oracle,
  probabilities,
  successProbability,
  uniform,
} from './grover';
import { mulberry32 } from './rng';

const norm = (s: Float64Array) => s.reduce((acc, a) => acc + a * a, 0);

function run(n: number, marked: number, rounds: number): Float64Array {
  const s = uniform(n);
  for (let k = 0; k < rounds; k++) {
    oracle(s, marked);
    diffuse(s);
  }
  return s;
}

describe('grover', () => {
  it('starts in an even mix', () => {
    const s = uniform(2);
    for (const p of probabilities(s)) expect(p).toBeCloseTo(0.25, 12);
  });

  it('the oracle and diffusion are unitary (norm preserved)', () => {
    const s = uniform(3);
    oracle(s, 5);
    expect(norm(s)).toBeCloseTo(1, 12);
    diffuse(s);
    expect(norm(s)).toBeCloseTo(1, 12);
    s.set([0.1, -0.7, 0.2, 0.3, -0.1, 0.5, 0.2, 0.2].map((a) => a / Math.sqrt(0.97)));
    diffuse(s);
    expect(norm(s)).toBeCloseTo(1, 12);
  });

  it('the oracle does not change any probability', () => {
    const s = uniform(2);
    oracle(s, 2);
    for (const p of probabilities(s)) expect(p).toBeCloseTo(0.25, 12);
    expect(s[2]).toBeCloseTo(-0.5, 12);
  });

  it('finds the marked item with certainty after one round for N = 4', () => {
    for (let marked = 0; marked < 4; marked++) {
      const p = probabilities(run(2, marked, 1));
      for (let i = 0; i < 4; i++) expect(p[i]).toBeCloseTo(i === marked ? 1 : 0, 12);
    }
  });

  it('matches sin²((2k+1)θ) for larger searches', () => {
    for (const n of [3, 4, 6]) {
      const N = 1 << n;
      for (let k = 0; k <= 5; k++) {
        expect(probabilities(run(n, 3, k))[3]).toBeCloseTo(successProbability(N, k), 12);
      }
    }
  });

  it('needs about (π/4)√N rounds', () => {
    expect(optimalRounds(4)).toBe(1);
    expect(optimalRounds(1 << 20)).toBe(804);
    expect(successProbability(1 << 20, optimalRounds(1 << 20))).toBeGreaterThan(0.999);
  });

  it('measurement frequencies follow the Born rule (4σ)', () => {
    const rng = mulberry32(11);
    const s = run(3, 6, 1); // N = 8, one round: P(marked) = 25/32
    const p = probabilities(s);
    const trials = 40_000;
    const counts = new Float64Array(8);
    for (let t = 0; t < trials; t++) counts[measureIndex(s, rng)]++;
    for (let i = 0; i < 8; i++) {
      const sigma = Math.sqrt((p[i] * (1 - p[i])) / trials);
      expect(Math.abs(counts[i] / trials - p[i])).toBeLessThan(4 * sigma + 1e-12);
    }
    expect(p[6]).toBeCloseTo(25 / 32, 12);
  });
});
