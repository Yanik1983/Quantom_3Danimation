/**
 * Time-dependent Schrödinger equation in 2D, split-step Fourier method (Strang splitting):
 *
 *   iℏ ∂ψ/∂t = [−ℏ²/2m ∇² + V(x,y) − iW(x,y)] ψ,   ℏ = m = 1
 *
 *   ψ(t+Δt) ≈ e^{−i(V−iW)Δt/2} · F⁻¹[ e^{−i|k|²Δt/2} · F[ e^{−i(V−iW)Δt/2} ψ ] ]
 *
 * The kinetic step is exact in momentum space and the potential step exact in position
 * space; the error is O(Δt³) per step from their non-commutation. Without absorption the
 * scheme is exactly unitary (norm-preserving) up to round-off.
 */
import { createFFT2D, fftWavenumbers, type FFT2DPlan } from './fft';
import type { Grid2D } from './grid';

export interface SplitStep2DOptions {
  grid: Grid2D;
  dt: number;
  /** Real potential V (row-major, length nx·ny). Omit for a free particle. */
  potential?: Float64Array;
  /** Absorbing potential W ≥ 0 (row-major). */
  absorb?: Float64Array;
}

export class SplitStep2D {
  readonly grid: Grid2D;
  readonly dt: number;
  private readonly fft: FFT2DPlan;
  /** e^{−i(V−iW)Δt/2}, interleaved complex. */
  private readonly halfV: Float64Array;
  /** e^{−i|k|²Δt/2}, interleaved complex. */
  private readonly kinetic: Float64Array;

  constructor(opts: SplitStep2DOptions) {
    const { grid, dt } = opts;
    const { nx, ny } = grid;
    this.grid = grid;
    this.dt = dt;
    this.fft = createFFT2D(nx, ny);
    const n = nx * ny;
    this.halfV = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) {
      const v = opts.potential ? opts.potential[i] : 0;
      const w = opts.absorb ? opts.absorb[i] : 0;
      const decay = Math.exp((-w * dt) / 2);
      this.halfV[2 * i] = decay * Math.cos((-v * dt) / 2);
      this.halfV[2 * i + 1] = decay * Math.sin((-v * dt) / 2);
    }
    const kx = fftWavenumbers(nx, grid.dx);
    const ky = fftWavenumbers(ny, grid.dy);
    this.kinetic = new Float64Array(2 * n);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const phase = (-(kx[i] * kx[i] + ky[j] * ky[j]) * dt) / 2;
        const idx = 2 * (j * nx + i);
        this.kinetic[idx] = Math.cos(phase);
        this.kinetic[idx + 1] = Math.sin(phase);
      }
    }
  }

  /** Advance ψ in place by `steps` time steps. */
  step(psi: Float64Array, steps = 1): void {
    for (let s = 0; s < steps; s++) {
      mulInPlace(psi, this.halfV);
      this.fft.forward(psi);
      mulInPlace(psi, this.kinetic);
      this.fft.inverse(psi);
      mulInPlace(psi, this.halfV);
    }
  }
}

function mulInPlace(a: Float64Array, b: Float64Array): void {
  for (let i = 0; i < a.length; i += 2) {
    const ar = a[i];
    const ai = a[i + 1];
    const br = b[i];
    const bi = b[i + 1];
    a[i] = ar * br - ai * bi;
    a[i + 1] = ar * bi + ai * br;
  }
}

/**
 * ψ(x,y) = exp(−(x−x₀)²/4σx² − (y−y₀)²/4σy²) · e^{i(kx x + ky y)}, normalized on the grid.
 * σ is the standard deviation of |ψ|² along each axis.
 */
export function gaussianPacket2D(
  grid: Grid2D,
  p: { x0: number; y0: number; sx: number; sy: number; kx: number; ky: number },
  out?: Float64Array,
): Float64Array {
  const { nx, ny, dx, dy } = grid;
  const psi = out ?? new Float64Array(2 * nx * ny);
  let norm = 0;
  for (let j = 0; j < ny; j++) {
    const y = grid.y0 + j * dy;
    const gy = -((y - p.y0) ** 2) / (4 * p.sy * p.sy);
    for (let i = 0; i < nx; i++) {
      const x = grid.x0 + i * dx;
      const a = Math.exp(gy - (x - p.x0) ** 2 / (4 * p.sx * p.sx));
      const ph = p.kx * x + p.ky * y;
      const idx = 2 * (j * nx + i);
      psi[idx] = a * Math.cos(ph);
      psi[idx + 1] = a * Math.sin(ph);
      norm += a * a;
    }
  }
  const s = 1 / Math.sqrt(norm * dx * dy);
  for (let i = 0; i < psi.length; i++) psi[i] *= s;
  return psi;
}

/**
 * Probability current j = (ℏ/m) Im(ψ* ∂ψ/∂x) at sample c from its neighbours l and r,
 * written as j = |ψ_c|² · ∂(arg ψ)/∂x with the phase gradient taken from arg(ψ_r ψ_l*).
 * This is exact for plane waves whenever k·Δx < π/2, whereas a centred difference of ψ
 * underestimates j by sin(kΔx)/(kΔx) (≈ 14 % for our double-slit grid).
 */
export function currentAt(
  cre: number,
  cim: number,
  lre: number,
  lim: number,
  rre: number,
  rim: number,
  inv2dx: number,
): number {
  const re = rre * lre + rim * lim;
  const im = rim * lre - rre * lim;
  return (cre * cre + cim * cim) * Math.atan2(im, re) * inv2dx;
}

/**
 * Adds the probability current across the vertical line x = x_column, times Δt, into
 * `accum` (length ny) — i.e. accumulates the time-integrated flux: the probability that
 * the particle crosses the line at each height y.
 */
export function accumulateFluxX(
  psi: Float64Array,
  grid: Grid2D,
  column: number,
  dt: number,
  accum: Float64Array,
): void {
  const { nx, ny, dx } = grid;
  const inv2dx = 1 / (2 * dx);
  for (let j = 0; j < ny; j++) {
    const c = 2 * (j * nx + column);
    accum[j] += currentAt(psi[c], psi[c + 1], psi[c - 2], psi[c - 1], psi[c + 2], psi[c + 3], inv2dx) * dt;
  }
}
