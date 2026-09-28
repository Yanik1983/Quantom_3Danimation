import { describe, expect, it } from 'vitest';
import { centeredGrid2D } from './grid';
import {
  emptyObservables,
  harmonicPotential2D,
  Observables2D,
  superposePackets,
  type Packet2D,
} from './wavepacket2d';
import { SplitStep2D } from './splitStep2d';

const grid = centeredGrid2D(128, 128, 20, 20);
const dA = grid.dx * grid.dy;
const packet = (o: Partial<Packet2D> = {}): Packet2D => ({
  x: 0,
  y: 0,
  kx: 0,
  ky: 0,
  sigma: 1,
  phase: 0,
  weight: 1,
  ...o,
});

describe('superposePackets', () => {
  it('produces a normalized wavefunction', () => {
    const psi = new Float64Array(2 * 128 * 128);
    superposePackets(grid, [packet({ x: -2, kx: 1.5 }), packet({ x: 3, y: 1, sigma: 1.4, phase: 2 })], psi);
    let n = 0;
    for (let i = 0; i < psi.length; i++) n += psi[i] * psi[i];
    expect(n * dA).toBeCloseTo(1, 12);
  });

  it('a single packet has ⟨r⟩ = r₀, ⟨p⟩ = ℏk, σ as specified, and E = (k² + 1/(2σ²))/2', () => {
    const psi = new Float64Array(2 * 128 * 128);
    const p = packet({ x: -1.5, y: 2, kx: 2, ky: -1, sigma: 1.2 });
    superposePackets(grid, [p], psi);
    const o = new Observables2D(grid).measure(psi, null, emptyObservables());
    expect(o.x).toBeCloseTo(p.x, 6);
    expect(o.y).toBeCloseTo(p.y, 6);
    expect(o.px).toBeCloseTo(p.kx, 6);
    expect(o.py).toBeCloseTo(p.ky, 6);
    expect(o.sx).toBeCloseTo(p.sigma, 6);
    // ⟨p²⟩ per axis = k² + 1/(4σ²); two axes.
    expect(o.energy).toBeCloseTo((p.kx ** 2 + p.ky ** 2 + 2 / (4 * p.sigma ** 2)) / 2, 6);
  });

  it('phase is invisible for one packet but decides interference for two', () => {
    const a = new Float64Array(2 * 128 * 128);
    const b = new Float64Array(2 * 128 * 128);
    superposePackets(grid, [packet({ phase: 0 })], a);
    superposePackets(grid, [packet({ phase: 1.3 })], b);
    for (let i = 0; i < a.length; i += 2) {
      expect(a[i] ** 2 + a[i + 1] ** 2).toBeCloseTo(b[i] ** 2 + b[i + 1] ** 2, 12);
    }
    // Two identical packets π out of phase cancel exactly.
    expect(superposePackets(grid, [packet(), packet({ phase: Math.PI })], a)).toBe(0);
    expect(a.every((v) => v === 0)).toBe(true);
    // In phase, they reinforce: norm² before normalization is 4× a single packet's.
    expect(superposePackets(grid, [packet(), packet()], a)).toBeCloseTo(4, 6);
  });
});

describe('harmonic bowl dynamics (ℏ = m = 1)', () => {
  const omega = 0.5;
  const V = harmonicPotential2D(grid, omega);
  const s0 = 1 / Math.sqrt(2 * omega);

  it('a displaced ground state is a coherent state: it swings to −x₀ after half a period without changing shape', () => {
    const psi = new Float64Array(2 * 128 * 128);
    superposePackets(grid, [packet({ x: 3, sigma: s0 })], psi);
    const dt = 0.01;
    const obs = new Observables2D(grid);
    const o = emptyObservables();
    const e0 = obs.measure(psi, V, emptyObservables()).energy;
    const solver = new SplitStep2D({ grid, dt, potential: V });
    const half = Math.round(Math.PI / omega / dt);
    solver.step(psi, Math.round(half / 2));
    obs.measure(psi, V, o);
    expect(o.x).toBeCloseTo(0, 2); // quarter period: at the centre…
    expect(o.px).toBeCloseTo(-3 * omega, 2); // …moving at maximum speed ω·x₀
    expect(o.sx).toBeCloseTo(s0, 3);
    solver.step(psi, half - Math.round(half / 2));
    obs.measure(psi, V, o);
    expect(o.x).toBeCloseTo(-3, 2);
    expect(o.sx).toBeCloseTo(s0, 3);
    expect(o.norm).toBeCloseTo(1, 10);
    expect(o.energy).toBeCloseTo(e0, 3); // energy conserved
    // E = ω(n̄ + 1) for a 2D coherent state with n̄ = ω x₀² / 2.
    expect(e0).toBeCloseTo(omega * (1 + (omega * 9) / 2), 3);
  });

  it('a squeezed packet breathes: its width oscillates at twice the trap frequency', () => {
    const psi = new Float64Array(2 * 128 * 128);
    superposePackets(grid, [packet({ sigma: 0.5 * s0 })], psi);
    const dt = 0.01;
    const solver = new SplitStep2D({ grid, dt, potential: V });
    const obs = new Observables2D(grid);
    const o = emptyObservables();
    // After a quarter period the narrow packet has become wide (σ → s0²/σ₀ = 2·s0).
    solver.step(psi, Math.round(Math.PI / (2 * omega) / dt));
    expect(obs.measure(psi, V, o).sx).toBeCloseTo(2 * s0, 2);
    solver.step(psi, Math.round(Math.PI / (2 * omega) / dt));
    expect(obs.measure(psi, V, o).sx).toBeCloseTo(0.5 * s0, 2);
  });
});
