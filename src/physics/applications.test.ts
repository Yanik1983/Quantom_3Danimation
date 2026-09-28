import { describe, expect, it } from 'vitest';
import { larmorMHz, oxideTunnelling, photonEnergyEV } from './applications';
import { transmission } from './barrier';
import { groverOptimalIterations, groverSuccess, QRegister } from './qregister';
import { mulberry32 } from './rng';

describe('application numbers', () => {
  it('hydrogen resonates at 63.9 MHz in a 1.5 T scanner and 127.7 MHz at 3 T', () => {
    expect(larmorMHz(1.5)).toBeCloseTo(63.87, 2);
    expect(larmorMHz(3)).toBeCloseTo(127.73, 2);
  });

  it('photon energies: a red 633 nm laser carries 1.96 eV', () => {
    expect(photonEnergyEV(632.8)).toBeCloseTo(1.959, 3);
    expect(photonEnergyEV(405)).toBeCloseTo(3.061, 3);
  });

  it('the unit-general barrier formula reduces to ℏ = m = 1 when ℏ²/2m = ½', () => {
    expect(transmission(0.7, 1.3, 1.1, 0.5)).toBe(transmission(0.7, 1.3, 1.1));
  });

  it('oxide tunnelling falls by roughly e^{−2κΔa}: each extra 0.5 nm of SiO₂ costs ~10³', () => {
    const E = 1;
    const V0 = 3.1;
    const kappa = Math.sqrt((V0 - E) / 0.0380998); // nm⁻¹ ≈ 7.4
    const ratio = oxideTunnelling(E, V0, 1.5) / oxideTunnelling(E, V0, 2.0);
    expect(Math.log(ratio)).toBeCloseTo(2 * kappa * 0.5, 1);
    expect(oxideTunnelling(E, V0, 1.0)).toBeGreaterThan(1e-7);
    expect(oxideTunnelling(E, V0, 1.0)).toBeLessThan(1e-5);
  });
});

describe('quantum register', () => {
  it('H on every qubit makes a uniform superposition; H twice undoes it', () => {
    const r = new QRegister(3);
    r.hadamardAll();
    for (let i = 0; i < 8; i++) expect(r.probability(i)).toBeCloseTo(1 / 8, 14);
    r.hadamardAll();
    expect(r.probability(0)).toBeCloseTo(1, 14);
  });

  it('Grover search on 8 items: 2 iterations find the marked item with P = 0.945', () => {
    const r = new QRegister(3);
    r.hadamardAll();
    expect(groverOptimalIterations(8)).toBe(2);
    for (let k = 1; k <= 3; k++) {
      r.oracle(5);
      r.diffuse();
      expect(r.probability(5)).toBeCloseTo(groverSuccess(8, k), 12);
      let total = 0;
      for (let i = 0; i < 8; i++) total += r.probability(i);
      expect(total).toBeCloseTo(1, 12);
    }
    expect(groverSuccess(8, 2)).toBeCloseTo(0.9453, 4);
  });

  it('measurement follows the Born rule and collapses the register', () => {
    const rng = mulberry32(3);
    let hits = 0;
    const n = 20_000;
    for (let t = 0; t < n; t++) {
      const r = new QRegister(3);
      r.hadamardAll();
      r.oracle(2);
      r.diffuse();
      r.oracle(2);
      r.diffuse();
      if (r.measure(rng) === 2) hits++;
      expect(r.probability(r.measure(rng))).toBe(1);
    }
    const p = groverSuccess(8, 2);
    expect(Math.abs(hits / n - p)).toBeLessThan(4 * Math.sqrt((p * (1 - p)) / n));
  });
});
