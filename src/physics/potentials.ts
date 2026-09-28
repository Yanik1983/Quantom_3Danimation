/**
 * Potential landscapes and absorbing boundary layers.
 */
import type { Grid1D, Grid2D } from './grid';

/**
 * Complex absorbing potential (CAP) profile −iW(x): W rises quadratically from 0 to
 * `strength` across a layer of `width` at each edge. Outgoing waves decay instead of
 * wrapping around the periodic FFT box.
 *
 * APPROX: a CAP reflects a little (≲1% for our layer widths and wavenumbers); the
 * alternative (perfectly matched layers) is overkill for visualization accuracy.
 */
export function capProfile(dist: number, width: number, strength: number): number {
  if (dist >= width) return 0;
  const s = (width - dist) / width;
  return strength * s * s;
}

export interface CapEdges {
  left?: number;
  right?: number;
  bottom?: number;
  top?: number;
}

export function cap2D(grid: Grid2D, widths: CapEdges, strength: number): Float64Array {
  const { nx, ny, dx, dy } = grid;
  const w = new Float64Array(nx * ny);
  const lx = nx * dx;
  const ly = ny * dy;
  for (let j = 0; j < ny; j++) {
    const yDistBottom = j * dy;
    const yDistTop = ly - (j + 1) * dy;
    for (let i = 0; i < nx; i++) {
      const xDistLeft = i * dx;
      const xDistRight = lx - (i + 1) * dx;
      let v = 0;
      if (widths.left) v += capProfile(xDistLeft, widths.left, strength);
      if (widths.right) v += capProfile(xDistRight, widths.right, strength);
      if (widths.bottom) v += capProfile(yDistBottom, widths.bottom, strength);
      if (widths.top) v += capProfile(yDistTop, widths.top, strength);
      w[j * nx + i] = v;
    }
  }
  return w;
}

export function cap1D(grid: Grid1D, width: number, strength: number): Float64Array {
  const w = new Float64Array(grid.n);
  const l = grid.n * grid.dx;
  for (let i = 0; i < grid.n; i++) {
    w[i] = capProfile(i * grid.dx, width, strength) + capProfile(l - (i + 1) * grid.dx, width, strength);
  }
  return w;
}

export interface SlitMask {
  /** x-coordinate of the mask's centre plane. */
  x: number;
  thickness: number;
  /** Absorption strength W inside the mask. */
  strength: number;
  /** Centre-to-centre slit separation. */
  separation: number;
  slitWidth: number;
  /** Which slits are open: [upper (y > 0), lower (y < 0)]. */
  open: [boolean, boolean];
}

/**
 * Adds an absorbing ("black") mask with two apertures centred at y = ±separation/2 into
 * the absorption array W. Anything striking the mask is absorbed, as with the blackened
 * masks used in real double-slit experiments.
 *
 * Why not a tall real potential wall? A barrier with V·Δt ≫ 1 and a decay length below
 * the grid spacing is under-resolved by split-step and leaks; an absorber is resolved.
 */
export function addSlitMask(grid: Grid2D, mask: SlitMask, w: Float64Array): void {
  const { nx, ny, dx, dy, x0, y0 } = grid;
  const half = mask.slitWidth / 2;
  const c = mask.separation / 2;
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * dy;
    const inUpper = mask.open[0] && Math.abs(y - c) < half;
    const inLower = mask.open[1] && Math.abs(y + c) < half;
    if (inUpper || inLower) continue;
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * dx;
      if (Math.abs(x - mask.x) <= mask.thickness / 2) w[j * nx + i] += mask.strength;
    }
  }
}

/**
 * Rectangular barrier V₀ on [center − width/2, center + width/2]. Each grid cell gets V₀
 * times the fraction of the cell [x − Δx/2, x + Δx/2] the barrier covers, so the
 * barrier's integrated strength and effective width match `width` exactly instead of
 * snapping to a whole number of cells.
 */
export function rectBarrier(grid: Grid1D, center: number, width: number, v0: number): Float64Array {
  const v = new Float64Array(grid.n);
  const lo = center - width / 2;
  const hi = center + width / 2;
  for (let i = 0; i < grid.n; i++) {
    const x = grid.x0 + i * grid.dx;
    const overlap = Math.min(hi, x + grid.dx / 2) - Math.max(lo, x - grid.dx / 2);
    if (overlap > 0) v[i] = (v0 * overlap) / grid.dx;
  }
  return v;
}
