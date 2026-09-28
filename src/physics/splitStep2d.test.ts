import { describe, expect, it } from 'vitest';
import { centeredGrid2D, type Grid2D } from './grid';
import { accumulateFluxX, currentAt, gaussianPacket2D, SplitStep2D } from './splitStep2d';
import { norm2 } from './complex';
import { cap2D } from './potentials';

function moments(psi: Float64Array, g: Grid2D) {
  let n = 0;
  let mx = 0;
  let mx2 = 0;
  let my = 0;
  for (let j = 0; j < g.ny; j++) {
    const y = g.y0 + j * g.dy;
    for (let i = 0; i < g.nx; i++) {
      const x = g.x0 + i * g.dx;
      const k = 2 * (j * g.nx + i);
      const p = psi[k] * psi[k] + psi[k + 1] * psi[k + 1];
      n += p;
      mx += p * x;
      mx2 += p * x * x;
      my += p * y;
    }
  }
  mx /= n;
  my /= n;
  return { mx, my, sx: Math.sqrt(mx2 / n - mx * mx) };
}

describe('SplitStep2D (ℏ = m = 1)', () => {
  const grid = centeredGrid2D(128, 128, 40, 40);
  const dA = grid.dx * grid.dy;

  it('builds normalized Gaussian packets', () => {
    const psi = gaussianPacket2D(grid, { x0: 0, y0: 0, sx: 1.5, sy: 2, kx: 1, ky: 0 });
    expect(norm2(psi, dA)).toBeCloseTo(1, 12);
    expect(moments(psi, grid).sx).toBeCloseTo(1.5, 6);
  });

  it('is unitary without absorption (norm conserved to round-off)', () => {
    const psi = gaussianPacket2D(grid, { x0: -3, y0: 2, sx: 1, sy: 1.2, kx: 2, ky: -1 });
    new SplitStep2D({ grid, dt: 0.01 }).step(psi, 200);
    expect(Math.abs(norm2(psi, dA) - 1)).toBeLessThan(1e-10);
  });

  it('matches the analytic free-particle evolution: ⟨x⟩ = x₀ + kt, σ(t) = σ₀√(1 + (t/2σ₀²)²)', () => {
    const s0 = 1;
    const k = 2;
    const t = 3;
    const dt = 0.01;
    const psi = gaussianPacket2D(grid, { x0: -6, y0: 1, sx: s0, sy: 1.5, kx: k, ky: 0 });
    new SplitStep2D({ grid, dt }).step(psi, Math.round(t / dt));
    const m = moments(psi, grid);
    expect(m.mx).toBeCloseTo(-6 + k * t, 3);
    expect(m.my).toBeCloseTo(1, 6);
    expect(m.sx).toBeCloseTo(s0 * Math.sqrt(1 + (t / (2 * s0 * s0)) ** 2), 3);
  });

  it('absorbs outgoing waves in the complex absorbing layer', () => {
    const absorb = cap2D(grid, { left: 5, right: 5, top: 5, bottom: 5 }, 10);
    const psi = gaussianPacket2D(grid, { x0: 5, y0: 0, sx: 1, sy: 1, kx: 5, ky: 0 });
    new SplitStep2D({ grid, dt: 0.01, absorb }).step(psi, 600);
    expect(norm2(psi, dA)).toBeLessThan(0.01);
  });

  it('time-integrated probability current through a line equals the probability that crossed it', () => {
    const g = centeredGrid2D(128, 64, 40, 20);
    const absorb = cap2D(g, { right: 4 }, 12);
    const psi = gaussianPacket2D(g, { x0: -8, y0: 0, sx: 1.2, sy: 2, kx: 4, ky: 0 });
    const dt = 0.01;
    const solver = new SplitStep2D({ grid: g, dt, absorb });
    const flux = new Float64Array(g.ny);
    const column = g.nx / 2;
    for (let s = 0; s < 800; s++) {
      solver.step(psi);
      accumulateFluxX(psi, g, column, dt, flux);
    }
    const crossed = flux.reduce((a, b) => a + b, 0) * g.dy;
    expect(crossed).toBeCloseTo(1, 2);
  });

  it('currentAt is exact for a plane wave A·e^{ikx} (j = |A|² k) while k·Δx < π/2', () => {
    const dx = 0.3;
    for (const k of [-4, -1, 0.5, 3, 5]) {
      const A = 0.7;
      const at = (x: number) => [A * Math.cos(k * x), A * Math.sin(k * x)];
      const [lr, li] = at(-dx);
      const [cr, ci] = at(0);
      const [rr, ri] = at(dx);
      expect(currentAt(cr, ci, lr, li, rr, ri, 1 / (2 * dx))).toBeCloseTo(A * A * k, 12);
    }
  });
});
