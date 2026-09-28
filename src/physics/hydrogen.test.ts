import { describe, expect, it } from 'vitest';
import {
  energyEV,
  energyHartree,
  laguerre,
  meanRadius,
  radial,
  radialCutoff,
  RadialSampler,
  sampleOrbital,
  validQuantumNumbers,
} from './hydrogen';
import { mulberry32 } from './rng';

const STATES: [number, number][] = [];
for (let n = 1; n <= 4; n++) for (let l = 0; l < n; l++) STATES.push([n, l]);

/** ∫₀^∞ f(r) dr by composite Simpson on [0, cutoff]. */
function integrate(f: (r: number) => number, n: number, steps = 20_000): number {
  const b = radialCutoff(n) * 1.5;
  const h = b / steps;
  let s = f(0) + f(b);
  for (let i = 1; i < steps; i++) s += (i % 2 ? 4 : 2) * f(i * h);
  return (s * h) / 3;
}

describe('generalized Laguerre polynomials', () => {
  it('match closed forms', () => {
    for (const x of [0, 0.5, 2.3, 7]) {
      for (const a of [1, 3, 5]) {
        expect(laguerre(0, a, x)).toBe(1);
        expect(laguerre(1, a, x)).toBeCloseTo(1 + a - x, 12);
        expect(laguerre(2, a, x)).toBeCloseTo((x * x - 2 * (a + 2) * x + (a + 1) * (a + 2)) / 2, 10);
      }
    }
  });
});

describe('hydrogen radial functions (atomic units)', () => {
  it.each(STATES)('R_%i%i is normalized: ∫ R² r² dr = 1', (n, l) => {
    expect(integrate((r) => (radial(n, l, r) * r) ** 2, n)).toBeCloseTo(1, 8);
  });

  it.each(STATES)('⟨r⟩ = [3n² − l(l+1)]/2 and ⟨1/r⟩ = 1/n² for n=%i, l=%i', (n, l) => {
    expect(integrate((r) => r ** 3 * radial(n, l, r) ** 2, n)).toBeCloseTo(meanRadius(n, l), 6);
    // Virial theorem: ⟨V⟩ = −⟨1/r⟩ = 2E_n → E_n = −1/(2n²).
    const inv = integrate((r) => r * radial(n, l, r) ** 2, n);
    expect(inv).toBeCloseTo(1 / (n * n), 8);
    expect(-inv / 2).toBeCloseTo(energyHartree(n), 8);
  });

  it.each(STATES)('R_%i%i has n − l − 1 radial nodes', (n, l) => {
    let nodes = 0;
    let prev = radial(n, l, 1e-3);
    for (let r = 1e-3; r < radialCutoff(n); r += 1e-3) {
      const v = radial(n, l, r);
      if (v * prev < 0) nodes++;
      prev = v;
    }
    expect(nodes).toBe(n - l - 1);
  });

  it.each(STATES)('u = rR solves the radial Schrödinger equation with E = −1/(2n²) (n=%i, l=%i)', (n, l) => {
    const u = (r: number) => r * radial(n, l, r);
    const h = 1e-3;
    const E = energyHartree(n);
    let umax = 0;
    for (let r = 0.2; r < 4 * n * n; r += 0.05) umax = Math.max(umax, Math.abs(u(r)));
    for (let r = 0.2; r < 4 * n * n; r += 0.37) {
      const upp = (u(r + h) - 2 * u(r) + u(r - h)) / (h * h);
      const residual = -0.5 * upp + ((l * (l + 1)) / (2 * r * r) - 1 / r - E) * u(r);
      expect(Math.abs(residual) / umax).toBeLessThan(1e-5);
    }
  });

  it('ground-state energy is −13.6 eV', () => {
    expect(energyEV(1)).toBeCloseTo(-13.6057, 3);
  });
});

describe('orbital sampling', () => {
  it('radial samples reproduce ⟨r⟩ and the r²R² histogram', () => {
    const rng = mulberry32(4);
    for (const [n, l, m] of [
      [2, 1, 0],
      [3, 2, -2],
      [4, 0, 0],
    ] as const) {
      const s = sampleOrbital(n, l, m, 40_000, rng);
      let mean = 0;
      let mean2 = 0;
      for (let k = 0; k < 40_000; k++) {
        const r = Math.hypot(s.positions[3 * k], s.positions[3 * k + 1], s.positions[3 * k + 2]);
        mean += r;
        mean2 += r * r;
      }
      mean /= 40_000;
      const sd = Math.sqrt(mean2 / 40_000 - mean * mean);
      expect(Math.abs(mean - meanRadius(n, l))).toBeLessThan((4 * sd) / Math.sqrt(40_000));
    }
  });

  it('angular samples follow Y²: ⟨cos²θ⟩ = 3/5 for 2p_z', () => {
    const s = sampleOrbital(2, 1, 0, 60_000, mulberry32(8));
    let c2 = 0;
    for (let k = 0; k < 60_000; k++) {
      const x = s.positions[3 * k];
      const y = s.positions[3 * k + 1];
      const z = s.positions[3 * k + 2];
      c2 += (z * z) / (x * x + y * y + z * z);
    }
    expect(c2 / 60_000).toBeCloseTo(3 / 5, 2);
  });

  it('assigns the sign of ψ: 2p_z is positive above the nodal plane, negative below', () => {
    const s = sampleOrbital(2, 1, 0, 2000, mulberry32(2));
    for (let k = 0; k < 2000; k++) expect(s.signs[k]).toBe(Math.sign(s.positions[3 * k + 2]) || 1);
  });

  it('r95 encloses 95 % of the radial probability', () => {
    const t = new RadialSampler(3, 1);
    const r95 = t.quantile(0.95);
    const inside = integrate((r) => (r <= r95 ? (r * radial(3, 1, r)) ** 2 : 0), 3);
    expect(inside).toBeCloseTo(0.95, 3);
  });

  it('validates quantum numbers', () => {
    expect(validQuantumNumbers(3, 2, -2)).toBe(true);
    expect(validQuantumNumbers(2, 2, 0)).toBe(false);
    expect(validQuantumNumbers(2, 1, 2)).toBe(false);
    expect(() => sampleOrbital(1, 1, 0, 10, mulberry32(1))).toThrow();
  });
});
