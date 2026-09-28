/**
 * 1D time-dependent Schrödinger equation by the split-step Fourier method (Strang):
 *   ψ(t+Δt) ≈ e^{−i(V−iW)Δt/2} F⁻¹[e^{−ik²Δt/2} F[e^{−i(V−iW)Δt/2} ψ]],   ℏ = m = 1.
 * Unitary when W = 0; the complex absorbing potential W ≥ 0 removes outgoing waves.
 */
import { createFFT, fftWavenumbers, type FFTPlan } from './fft';
import type { Grid1D } from './grid';

export interface SplitStep1DOptions {
  grid: Grid1D;
  dt: number;
  potential?: Float64Array;
  absorb?: Float64Array;
}

export class SplitStep1D {
  readonly grid: Grid1D;
  readonly dt: number;
  private readonly fft: FFTPlan;
  private readonly halfV: Float64Array;
  private readonly kinetic: Float64Array;

  constructor(o: SplitStep1DOptions) {
    const { grid, dt } = o;
    this.grid = grid;
    this.dt = dt;
    this.fft = createFFT(grid.n);
    this.halfV = new Float64Array(2 * grid.n);
    for (let i = 0; i < grid.n; i++) {
      const v = o.potential ? o.potential[i] : 0;
      const w = o.absorb ? o.absorb[i] : 0;
      const d = Math.exp((-w * dt) / 2);
      this.halfV[2 * i] = d * Math.cos((-v * dt) / 2);
      this.halfV[2 * i + 1] = d * Math.sin((-v * dt) / 2);
    }
    const k = fftWavenumbers(grid.n, grid.dx);
    this.kinetic = new Float64Array(2 * grid.n);
    for (let i = 0; i < grid.n; i++) {
      const ph = (-k[i] * k[i] * dt) / 2;
      this.kinetic[2 * i] = Math.cos(ph);
      this.kinetic[2 * i + 1] = Math.sin(ph);
    }
  }

  step(psi: Float64Array, steps = 1): void {
    for (let s = 0; s < steps; s++) {
      mul(psi, this.halfV);
      this.fft.forward(psi);
      mul(psi, this.kinetic);
      this.fft.inverse(psi);
      mul(psi, this.halfV);
    }
  }
}

function mul(a: Float64Array, b: Float64Array): void {
  for (let i = 0; i < a.length; i += 2) {
    const ar = a[i];
    const ai = a[i + 1];
    a[i] = ar * b[i] - ai * b[i + 1];
    a[i + 1] = ar * b[i + 1] + ai * b[i];
  }
}

/** ∫ |ψ|² dx over x ∈ [from, to] (sample centres inside the interval). */
export function probabilityIn(psi: Float64Array, grid: Grid1D, from: number, to: number): number {
  let s = 0;
  const i0 = Math.max(0, Math.ceil((from - grid.x0) / grid.dx));
  const i1 = Math.min(grid.n - 1, Math.floor((to - grid.x0) / grid.dx));
  for (let i = i0; i <= i1; i++) s += psi[2 * i] * psi[2 * i] + psi[2 * i + 1] * psi[2 * i + 1];
  return s * grid.dx;
}
