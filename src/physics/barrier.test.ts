import { describe, expect, it } from 'vitest';
import { classicalTransmission, packetTransmission, transmission } from './barrier';
import { centeredGrid1D } from './grid';
import { cap1D, rectBarrier } from './potentials';
import { probabilityIn, SplitStep1D } from './splitStep1d';
import { buildPacket1D } from './wavepacket1d';

describe('rectangular barrier transmission (ℏ = m = 1)', () => {
  it('matches hand-computed values', () => {
    // E = 0.5, V0 = 1, a = 1: κ = 1, T = 1 / (1 + sinh²(1)/(4·0.5·0.5)) = 1/(1 + sinh²1)
    expect(transmission(0.5, 1, 1)).toBeCloseTo(1 / (1 + Math.sinh(1) ** 2), 12);
    // E = 3, V0 = 1, a = 1: k2 = 2, T = 1/(1 + sin²(2)/(4·3·2))
    expect(transmission(3, 1, 1)).toBeCloseTo(1 / (1 + Math.sin(2) ** 2 / 24), 12);
  });

  it('is continuous through E = V₀', () => {
    const V0 = 2;
    const a = 1.3;
    const at = transmission(V0, V0, a);
    expect(at).toBeCloseTo(1 / (1 + (V0 * a * a) / 2), 12);
    expect(transmission(V0 - 1e-6, V0, a)).toBeCloseTo(at, 5);
    expect(transmission(V0 + 1e-6, V0, a)).toBeCloseTo(at, 5);
  });

  it('is perfectly transparent at resonances k₂a = nπ', () => {
    const V0 = 1;
    const a = 2;
    for (const n of [1, 2, 3]) {
      const k2 = (n * Math.PI) / a;
      expect(transmission(V0 + (k2 * k2) / 2, V0, a)).toBeCloseTo(1, 12);
    }
  });

  it('decays exponentially with width deep in the tunnelling regime', () => {
    const E = 0.5;
    const V0 = 3;
    const kappa = Math.sqrt(2 * (V0 - E));
    const r = transmission(E, V0, 3) / transmission(E, V0, 2);
    expect(Math.log(r)).toBeCloseTo(-2 * kappa, 1);
  });

  it('classical mechanics forbids what quantum mechanics allows', () => {
    // Packet with mean energy well below the barrier: classically ~0, quantum > 0.
    expect(classicalTransmission(1, 4, 2)).toBeLessThan(1e-6);
    expect(packetTransmission(1, 4, 2, 0.8)).toBeGreaterThan(0.05);
  });
});

describe('split-step 1D solver', () => {
  const grid = centeredGrid1D(2048, 160);

  it('is unitary without absorption', () => {
    const psi = new Float64Array(2 * grid.n);
    buildPacket1D(grid, { shape: 'gaussian', sigma: 2, x0: -20, k0: 1.5, chirp: 0, separation: 0 }, psi);
    const V = rectBarrier(grid, 0, 1, 1.5);
    new SplitStep1D({ grid, dt: 0.02, potential: V }).step(psi, 500);
    let n = 0;
    for (let i = 0; i < psi.length; i++) n += psi[i] * psi[i];
    expect(n * grid.dx).toBeCloseTo(1, 10);
  });

  /**
   * Scatter a Gaussian packet and, once the transmitted and reflected parts have separated
   * (but before either reaches the absorbing edges), read T and R off as probabilities.
   */
  function scatter(k0: number, V0: number, a: number, sigma = 4) {
    const psi = new Float64Array(2 * grid.n);
    buildPacket1D(grid, { shape: 'gaussian', sigma, x0: -30, k0, chirp: 0, separation: 0 }, psi);
    const V = rectBarrier(grid, 0, a, V0);
    const W = cap1D(grid, 12, 2);
    const dt = 0.02;
    new SplitStep1D({ grid, dt, potential: V, absorb: W }).step(psi, Math.round(62 / k0 / dt));
    return {
      T: probabilityIn(psi, grid, a / 2, Infinity),
      R: probabilityIn(psi, grid, -Infinity, -a / 2),
    };
  }

  it.each([
    [1.2, 1.0, 1.0], // tunnelling: E = 0.72 < V0
    [1.5, 1.5, 1.2], // E = 1.125 < V0
    [2.0, 1.2, 1.0], // over the barrier: E = 2 > V0
  ])(
    'simulated T for k₀=%f, V₀=%f, a=%f matches the packet-averaged analytic value; T + R = 1',
    (k0, V0, a) => {
      const { T, R } = scatter(k0, V0, a);
      expect(T).toBeCloseTo(packetTransmission(k0, 4, V0, a), 2);
      expect(T + R).toBeCloseTo(1, 2);
    },
  );
});
