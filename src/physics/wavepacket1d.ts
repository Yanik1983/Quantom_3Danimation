/**
 * One-dimensional wave packets and their momentum-space wavefunctions (ℏ = 1, so p = k):
 *
 *   φ(p) = (2π)^{−1/2} ∫ ψ(x) e^{−ipx} dx
 *
 * computed with an FFT: φ(p_m) = Δx (2π)^{−1/2} e^{−i p_m x_0} FFT[ψ]_m, reordered so p
 * increases monotonically. Moments give Δx and Δp; for every state Δx·Δp ≥ 1/2.
 */
import { createFFT, fftWavenumbers, type FFTPlan } from './fft';
import type { Grid1D } from './grid';

export type PacketShape = 'gaussian' | 'flattop' | 'twopeaks';

export interface Packet1D {
  shape: PacketShape;
  /** Width parameter: standard deviation for the Gaussian, half-width scale otherwise. */
  sigma: number;
  /** Centre position. */
  x0: number;
  /** Mean momentum (wavenumber). */
  k0: number;
  /** Linear chirp c: extra phase e^{i c (x − x₀)²}. */
  chirp: number;
  /** Peak separation for 'twopeaks'. */
  separation: number;
}

/** Real envelope of the chosen shape at offset u = x − x₀. */
function envelope(p: Packet1D, u: number): number {
  switch (p.shape) {
    case 'gaussian':
      return Math.exp(-(u * u) / (4 * p.sigma * p.sigma));
    case 'flattop': {
      // Super-Gaussian exp(−(u/w)^8): flat top with smooth (finite-Δp) edges.
      const t = u / (2 * p.sigma);
      const t2 = t * t;
      return Math.exp(-t2 * t2 * t2 * t2);
    }
    case 'twopeaks': {
      const h = p.separation / 2;
      const s = 4 * p.sigma * p.sigma;
      return Math.exp(-((u - h) * (u - h)) / s) + Math.exp(-((u + h) * (u + h)) / s);
    }
  }
}

/** Fill `out` (interleaved complex) with the normalized packet on the grid. */
export function buildPacket1D(grid: Grid1D, p: Packet1D, out: Float64Array): void {
  let n2 = 0;
  for (let i = 0; i < grid.n; i++) {
    const x = grid.x0 + i * grid.dx;
    const u = x - p.x0;
    const a = envelope(p, u);
    const ph = p.k0 * x + p.chirp * u * u;
    out[2 * i] = a * Math.cos(ph);
    out[2 * i + 1] = a * Math.sin(ph);
    n2 += a * a;
  }
  const s = 1 / Math.sqrt(n2 * grid.dx);
  for (let i = 0; i < 2 * grid.n; i++) out[i] *= s;
}

export interface Spread {
  mean: number;
  sd: number;
}

/** Mean and standard deviation of a density sampled at `coords` with spacing `d`. */
export function spread(coords: Float64Array, psi: Float64Array): Spread {
  let n = 0;
  let m = 0;
  let m2 = 0;
  for (let i = 0; i < coords.length; i++) {
    const p = psi[2 * i] * psi[2 * i] + psi[2 * i + 1] * psi[2 * i + 1];
    n += p;
    m += p * coords[i];
    m2 += p * coords[i] * coords[i];
  }
  m /= n;
  return { mean: m, sd: Math.sqrt(Math.max(0, m2 / n - m * m)) };
}

/**
 * Momentum-space transform with preallocated buffers. `p` holds momenta in increasing
 * order; `phi` the matching complex amplitudes, normalized so Σ|φ|² Δp = 1.
 */
export class MomentumTransform {
  readonly p: Float64Array;
  readonly phi: Float64Array;
  readonly dp: number;
  private readonly grid: Grid1D;
  private readonly fft: FFTPlan;
  private readonly work: Float64Array;
  private readonly kRaw: Float64Array;

  constructor(grid: Grid1D) {
    this.grid = grid;
    this.fft = createFFT(grid.n);
    this.work = new Float64Array(2 * grid.n);
    this.kRaw = fftWavenumbers(grid.n, grid.dx);
    this.dp = (2 * Math.PI) / (grid.n * grid.dx);
    this.p = new Float64Array(grid.n);
    this.phi = new Float64Array(2 * grid.n);
    const half = grid.n / 2;
    for (let m = 0; m < grid.n; m++) this.p[m] = this.kRaw[(m + half) % grid.n];
  }

  transform(psi: Float64Array): Float64Array {
    const { n, dx, x0 } = this.grid;
    this.work.set(psi);
    this.fft.forward(this.work);
    const c = dx / Math.sqrt(2 * Math.PI);
    const half = n / 2;
    for (let m = 0; m < n; m++) {
      const src = (m + half) % n; // fftshift: most negative momentum first
      const k = this.kRaw[src];
      // Grid starts at x₀, not 0: multiply by e^{−i k x₀}.
      const cr = Math.cos(-k * x0);
      const ci = Math.sin(-k * x0);
      const re = this.work[2 * src];
      const im = this.work[2 * src + 1];
      this.phi[2 * m] = c * (re * cr - im * ci);
      this.phi[2 * m + 1] = c * (re * ci + im * cr);
    }
    return this.phi;
  }
}
