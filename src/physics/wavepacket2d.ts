/**
 * Two-dimensional wavefunctions built from Gaussian wave packets, and their observables.
 * Units: ℏ = m = 1.
 *
 *   ψ(r) = N Σ_j w_j e^{iφ_j} exp(−|r − r_j|² / 4σ_j²) e^{i k_j·r}
 *
 * σ_j is the standard deviation of |ψ_j|² along each axis.
 */
import { createFFT2D, fftWavenumbers, type FFT2DPlan } from './fft';
import type { Grid2D } from './grid';

export interface Packet2D {
  x: number;
  y: number;
  kx: number;
  ky: number;
  sigma: number;
  /** Relative phase φ (radians). */
  phase: number;
  /** Relative amplitude weight (≥ 0). */
  weight: number;
}

/**
 * Write the normalized superposition of `packets` into `out` (interleaved complex,
 * row-major). Returns the norm² before normalization; if the packets cancel exactly
 * (norm² ≈ 0) the output is left as all zeros and 0 is returned.
 */
export function superposePackets(grid: Grid2D, packets: readonly Packet2D[], out: Float64Array): number {
  const { nx, ny, dx, dy, x0, y0 } = grid;
  out.fill(0);
  for (const p of packets) {
    if (p.weight <= 0) continue;
    // Each packet is individually normalized before weighting, so weights are meaningful.
    const amp = p.weight / Math.sqrt(2 * Math.PI * p.sigma * p.sigma);
    const inv4s2 = 1 / (4 * p.sigma * p.sigma);
    const cutoff = 7 * p.sigma;
    for (let j = 0; j < ny; j++) {
      const ry = y0 + j * dy - p.y;
      if (Math.abs(ry) > cutoff) continue;
      for (let i = 0; i < nx; i++) {
        const rx = x0 + i * dx - p.x;
        if (Math.abs(rx) > cutoff) continue;
        const a = amp * Math.exp(-(rx * rx + ry * ry) * inv4s2);
        const ph = p.phase + p.kx * (rx + p.x) + p.ky * (ry + p.y);
        const k = 2 * (j * nx + i);
        out[k] += a * Math.cos(ph);
        out[k + 1] += a * Math.sin(ph);
      }
    }
  }
  let n2 = 0;
  for (let i = 0; i < out.length; i++) n2 += out[i] * out[i];
  n2 *= dx * dy;
  if (n2 < 1e-12) {
    out.fill(0);
    return 0;
  }
  const s = 1 / Math.sqrt(n2);
  for (let i = 0; i < out.length; i++) out[i] *= s;
  return n2;
}

/** V(r) = ½ ω² |r|². Ground-state width σ = 1/√(2ω). */
export function harmonicPotential2D(grid: Grid2D, omega: number): Float64Array {
  const { nx, ny, dx, dy, x0, y0 } = grid;
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * dy;
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * dx;
      v[j * nx + i] = 0.5 * omega * omega * (x * x + y * y);
    }
  }
  return v;
}

export interface Observables {
  norm: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  px: number;
  py: number;
  /** ⟨H⟩ = ⟨p²⟩/2 + ⟨V⟩ */
  energy: number;
}

export function emptyObservables(): Observables {
  return { norm: 0, x: 0, y: 0, sx: 0, sy: 0, px: 0, py: 0, energy: 0 };
}

/**
 * Position moments on the grid; momentum moments and kinetic energy from the FFT
 * (exact spectral derivatives). Preallocated: `measure` allocates nothing.
 */
export class Observables2D {
  private readonly grid: Grid2D;
  private readonly fft: FFT2DPlan;
  private readonly scratch: Float64Array;
  private readonly kx: Float64Array;
  private readonly ky: Float64Array;

  constructor(grid: Grid2D) {
    this.grid = grid;
    this.fft = createFFT2D(grid.nx, grid.ny);
    this.scratch = new Float64Array(2 * grid.nx * grid.ny);
    this.kx = fftWavenumbers(grid.nx, grid.dx);
    this.ky = fftWavenumbers(grid.ny, grid.dy);
  }

  measure(psi: Float64Array, potential: Float64Array | null, out: Observables): Observables {
    const { nx, ny, dx, dy, x0, y0 } = this.grid;
    let n = 0;
    let mx = 0;
    let my = 0;
    let mx2 = 0;
    let my2 = 0;
    let ev = 0;
    for (let j = 0; j < ny; j++) {
      const y = y0 + j * dy;
      for (let i = 0; i < nx; i++) {
        const x = x0 + i * dx;
        const idx = j * nx + i;
        const p = psi[2 * idx] * psi[2 * idx] + psi[2 * idx + 1] * psi[2 * idx + 1];
        n += p;
        mx += p * x;
        my += p * y;
        mx2 += p * x * x;
        my2 += p * y * y;
        if (potential) ev += p * potential[idx];
      }
    }
    out.norm = n * dx * dy;
    if (n <= 0) {
      out.x = out.y = out.sx = out.sy = out.px = out.py = out.energy = 0;
      return out;
    }
    out.x = mx / n;
    out.y = my / n;
    out.sx = Math.sqrt(Math.max(0, mx2 / n - out.x * out.x));
    out.sy = Math.sqrt(Math.max(0, my2 / n - out.y * out.y));

    this.scratch.set(psi);
    this.fft.forward(this.scratch);
    let m = 0;
    let pkx = 0;
    let pky = 0;
    let k2 = 0;
    for (let j = 0; j < ny; j++) {
      const ky = this.ky[j];
      for (let i = 0; i < nx; i++) {
        const kx = this.kx[i];
        const idx = 2 * (j * nx + i);
        const p = this.scratch[idx] * this.scratch[idx] + this.scratch[idx + 1] * this.scratch[idx + 1];
        m += p;
        pkx += p * kx;
        pky += p * ky;
        k2 += p * (kx * kx + ky * ky);
      }
    }
    out.px = pkx / m;
    out.py = pky / m;
    out.energy = k2 / m / 2 + ev / n;
    return out;
  }
}
