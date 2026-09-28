/**
 * Double-slit experiment (ℏ = m = 1). A Gaussian wave packet travels in +x toward an
 * absorbing mask with two slits at y = ±d/2; the detection pattern is the time-integrated
 * probability current through a screen line x = X_s behind the mask.
 *
 * We propagate ψ₁ — the packet with only the upper slit open — with the split-step
 * Fourier TDSE solver. The packet and mask are mirror-symmetric in y, so the lower-slit
 * wave is ψ₂(x, y) = ψ₁(x, −y). Behind the mask:
 *
 *   Both slits, no which-path info:   ψ = ψ₁ + ψ₂       →  P ∝ |ψ₁ + ψ₂|²  (interference)
 *   Ideal which-path measurement:     ρ = |ψ₁⟩⟨ψ₁| + |ψ₂⟩⟨ψ₂|  →  P ∝ |ψ₁|² + |ψ₂|²
 *
 * The second line is decoherence: the slit detector's two pointer states are orthogonal,
 * so tracing them out deletes the cross term. No observer is involved — only interaction.
 *
 * APPROX: ψ_both ≈ ψ₁ + ψ₂ (linear superposition of single-slit waves) neglects the
 * near-field coupling between apertures via the mask front; for an absorbing mask this is
 * the Kirchhoff approximation. The test suite checks it against a direct both-open run.
 */
import { accumulateFluxX, currentAt, gaussianPacket2D, SplitStep2D } from './splitStep2d';
import { centeredGrid2D, type Grid2D } from './grid';
import { addSlitMask, cap2D } from './potentials';

export interface DoubleSlitConfig {
  nx: number;
  ny: number;
  /** Box extent along propagation (x) and transverse (y). */
  lx: number;
  ly: number;
  /** Mean wavenumber (λ = 2π/k0). */
  k0: number;
  dt: number;
  slitSeparation: number;
  slitWidth: number;
  maskX: number;
  maskThickness: number;
  screenX: number;
  packetX0: number;
  packetSx: number;
  packetSy: number;
  /** Width of the absorbing layers at the box edges. */
  edgeLayer: number;
}

export const DEFAULT_DOUBLE_SLIT: DoubleSlitConfig = {
  nx: 256,
  ny: 128,
  lx: 40,
  ly: 36,
  k0: 8,
  dt: 0.02,
  slitSeparation: 6,
  slitWidth: 1.2,
  maskX: -6,
  maskThickness: 0.8,
  screenX: 14,
  packetX0: -14,
  packetSx: 1.4,
  packetSy: 7.5,
  edgeLayer: 3.5,
};

/*
 * Geometry choice (λ ≈ 0.79, d = 6, a = 1.2, D = 20): narrow slits spread each beam far
 * wider than the slit separation, giving high-contrast fringes. The price, which is real
 * physics, is that the two single-slit patterns overlap heavily, so an ideal which-path
 * measurement yields one smooth band (P₁ + P₂) rather than two separated stripes. Two
 * separated bands require a near-field geometry, where the fringes themselves lose
 * contrast — high-contrast fringes and separated which-path bands exclude each other.
 */

/** Coarser grid for low-end devices (same physics, same geometry). */
export const LOW_DOUBLE_SLIT: DoubleSlitConfig = { ...DEFAULT_DOUBLE_SLIT, dt: 0.03 };

export interface DoubleSlitResult {
  grid: Grid2D;
  /** Normalized detection probabilities per screen cell (index = y row). */
  coherent: Float64Array;
  /** P₁(y): upper slit only (normalized). The lower-slit pattern is its mirror image. */
  upper: Float64Array;
  /** (P₁ + P₂)/2: pattern with an ideal which-path measurement (normalized). */
  whichPath: Float64Array;
  /** Probability that crossed the screen in the single-slit run. */
  transmittedSingle: number;
  steps: number;
  /** Fraction of the run at which half the coherent flux has crossed the screen. */
  arrivalFraction: number;
  /** Fraction of the run at which the packet centre reaches the mask. */
  maskFraction: number;
}

export interface FrameSink {
  /** Capture every `every` steps. */
  every: number;
  capture(psi: Float64Array, step: number): void;
}

export function doubleSlitSetup(cfg: DoubleSlitConfig, open: [boolean, boolean]) {
  const grid = centeredGrid2D(cfg.nx, cfg.ny, cfg.lx, cfg.ly);
  const e = cfg.edgeLayer;
  const absorb = cap2D(grid, { left: e, right: e, top: e, bottom: e }, 2.5 * cfg.k0);
  addSlitMask(
    grid,
    {
      x: cfg.maskX,
      thickness: cfg.maskThickness,
      strength: 3.0 * cfg.k0 * cfg.k0,
      separation: cfg.slitSeparation,
      slitWidth: cfg.slitWidth,
      open,
    },
    absorb,
  );
  const solver = new SplitStep2D({ grid, dt: cfg.dt, absorb });
  const psi = gaussianPacket2D(grid, {
    x0: cfg.packetX0,
    y0: 0,
    sx: cfg.packetSx,
    sy: cfg.packetSy,
    kx: cfg.k0,
    ky: 0,
  });
  const screenColumn = Math.round((cfg.screenX - grid.x0) / grid.dx);
  return { grid, solver, psi, screenColumn };
}

/** Steps for the packet (and its slower, strongly diffracted parts) to cross the screen. */
export function doubleSlitSteps(cfg: DoubleSlitConfig): number {
  const distance = cfg.screenX - cfg.packetX0 + 4 * cfg.packetSx;
  return Math.ceil((1.7 * distance) / cfg.k0 / cfg.dt);
}

/** Row index of the mirror image y → −y on a centred grid. */
export function mirrorRow(j: number, ny: number): number {
  return (ny - j) % ny;
}

/**
 * Accumulate time-integrated x-flux through `column` for the coherent sum ψ₁(y)+ψ₁(−y)
 * and for ψ₁ alone (see currentAt).
 */
function accumulateFluxes(
  psi: Float64Array,
  grid: Grid2D,
  column: number,
  dt: number,
  coherent: Float64Array,
  single: Float64Array,
): void {
  const { nx, ny, dx } = grid;
  const inv2dx = 1 / (2 * dx);
  for (let j = 0; j < ny; j++) {
    const c = 2 * (j * nx + column);
    const m = 2 * (mirrorRow(j, ny) * nx + column);
    single[j] += currentAt(psi[c], psi[c + 1], psi[c - 2], psi[c - 1], psi[c + 2], psi[c + 3], inv2dx) * dt;
    coherent[j] +=
      currentAt(
        psi[c] + psi[m],
        psi[c + 1] + psi[m + 1],
        psi[c - 2] + psi[m - 2],
        psi[c - 1] + psi[m - 1],
        psi[c + 2] + psi[m + 2],
        psi[c + 3] + psi[m + 3],
        inv2dx,
      ) * dt;
  }
}

function normalizePattern(p: Float64Array): number {
  let total = 0;
  for (let j = 0; j < p.length; j++) {
    // Backflow through the screen is negligible (absorber behind it); clamp round-off.
    if (p[j] < 0) p[j] = 0;
    total += p[j];
  }
  if (total > 0) for (let j = 0; j < p.length; j++) p[j] /= total;
  return total;
}

export function runDoubleSlit(
  cfg: DoubleSlitConfig,
  sink?: FrameSink,
  onProgress?: (fraction: number) => void,
): DoubleSlitResult {
  const { grid, solver, psi, screenColumn } = doubleSlitSetup(cfg, [true, false]);
  const coherent = new Float64Array(grid.ny);
  const upper = new Float64Array(grid.ny);
  const steps = doubleSlitSteps(cfg);
  const cumulative = new Float64Array(steps);
  for (let s = 0; s < steps; s++) {
    if (sink && s % sink.every === 0) sink.capture(psi, s);
    solver.step(psi);
    accumulateFluxes(psi, grid, screenColumn, cfg.dt, coherent, upper);
    let sum = 0;
    for (let j = 0; j < grid.ny; j++) sum += coherent[j];
    cumulative[s] = sum;
    if (onProgress && s % 16 === 0) onProgress(s / steps);
  }
  const total = cumulative[steps - 1];
  let arrival = steps - 1;
  for (let s = 0; s < steps; s++) {
    if (cumulative[s] >= total / 2) {
      arrival = s;
      break;
    }
  }
  normalizePattern(coherent);
  const transmittedSingle = normalizePattern(upper) * grid.dy;
  const whichPath = new Float64Array(grid.ny);
  for (let j = 0; j < grid.ny; j++) whichPath[j] = (upper[j] + upper[mirrorRow(j, grid.ny)]) / 2;
  return {
    grid,
    coherent,
    upper,
    whichPath,
    transmittedSingle,
    steps,
    arrivalFraction: arrival / steps,
    maskFraction: (cfg.maskX - cfg.packetX0) / cfg.k0 / cfg.dt / steps,
  };
}

/** Direct simulation with the given slits open (used to validate the superposition). */
export function runDirect(cfg: DoubleSlitConfig, open: [boolean, boolean]): Float64Array {
  const { grid, solver, psi, screenColumn } = doubleSlitSetup(cfg, open);
  const flux = new Float64Array(grid.ny);
  const steps = doubleSlitSteps(cfg);
  for (let s = 0; s < steps; s++) {
    solver.step(psi);
    accumulateFluxX(psi, grid, screenColumn, cfg.dt, flux);
  }
  normalizePattern(flux);
  return flux;
}

/**
 * Pure interference factor: P_coherent / P_whichPath = 1 + V(y)·cos Δφ(y). Dividing out
 * the single-slit envelope leaves maxima exactly where the path difference is mλ.
 */
export function interferenceFactor(r: DoubleSlitResult): Float64Array {
  const f = new Float64Array(r.coherent.length);
  let max = 0;
  for (let j = 0; j < f.length; j++) max = Math.max(max, r.whichPath[j]);
  for (let j = 0; j < f.length; j++) {
    // Only where the envelope carries signal; elsewhere the ratio is numerical noise.
    f[j] = r.whichPath[j] > 1e-3 * max ? r.coherent[j] / r.whichPath[j] : 0;
  }
  return f;
}

/** Fringe visibility (Imax − Imin)/(Imax + Imin) over [from, to). */
export function fringeVisibility(pattern: ArrayLike<number>, from: number, to: number): number {
  let max = -Infinity;
  let min = Infinity;
  for (let i = from; i < to; i++) {
    max = Math.max(max, pattern[i]);
    min = Math.min(min, pattern[i]);
  }
  return (max - min) / (max + min);
}

/** Indices of local maxima above `threshold` × global max. */
export function findPeaks(pattern: ArrayLike<number>, threshold = 0.1): number[] {
  let gmax = 0;
  for (let i = 0; i < pattern.length; i++) gmax = Math.max(gmax, pattern[i]);
  const peaks: number[] = [];
  for (let i = 1; i < pattern.length - 1; i++) {
    if (pattern[i] > threshold * gmax && pattern[i] >= pattern[i - 1] && pattern[i] > pattern[i + 1])
      peaks.push(i);
  }
  return peaks;
}

/**
 * Bright-fringe positions from exact two-point path difference (no small-angle
 * approximation): |r₂ − r₁| = mλ with r = distance from slit centre to screen point.
 */
export function predictedMaxima(cfg: DoubleSlitConfig, maxOrder: number): number[] {
  const lambda = (2 * Math.PI) / cfg.k0;
  const D = cfg.screenX - cfg.maskX;
  const h = cfg.slitSeparation / 2;
  const out: number[] = [];
  for (let m = -maxOrder; m <= maxOrder; m++) {
    // Solve f(y) = r_lower − r_upper − mλ = 0 by bisection on y ∈ [−D, D].
    const f = (y: number) => Math.hypot(D, y + h) - Math.hypot(D, y - h) - m * lambda;
    let a = -D;
    let b = D;
    if (f(a) * f(b) > 0) continue;
    for (let it = 0; it < 80; it++) {
      const mid = (a + b) / 2;
      if (f(a) * f(mid) <= 0) b = mid;
      else a = mid;
    }
    out.push((a + b) / 2);
  }
  return out;
}
