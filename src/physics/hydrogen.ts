/**
 * Hydrogen atom eigenfunctions in atomic units (a₀ = ℏ = mₑ = e²/4πε₀ = 1):
 *
 *   ψ_nlm(r, θ, φ) = R_nl(r) · Y_lm(θ, φ),      E_n = −1/(2n²) Hartree = −13.6057 eV / n²
 *   R_nl(r) = √[(2/n)³ (n−l−1)! / (2n (n+l)!)] · e^{−r/n} (2r/n)^l · L_{n−l−1}^{2l+1}(2r/n)
 *
 * Non-relativistic, infinite nuclear mass, no spin (fine structure is ~10⁻⁵ of E_n).
 */
import { realYlm } from './sphericalHarmonics';
import type { Rng } from './rng';

export const HARTREE_EV = 27.211386;
export const BOHR_NM = 0.0529177;

/** Generalized Laguerre polynomial L_k^α(x) via the three-term recurrence. */
export function laguerre(k: number, alpha: number, x: number): number {
  if (k === 0) return 1;
  let l0 = 1;
  let l1 = 1 + alpha - x;
  for (let j = 1; j < k; j++) {
    const l2 = ((2 * j + 1 + alpha - x) * l1 - (j + alpha) * l0) / (j + 1);
    l0 = l1;
    l1 = l2;
  }
  return l1;
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function validQuantumNumbers(n: number, l: number, m: number): boolean {
  return Number.isInteger(n) && n >= 1 && l >= 0 && l < n && Math.abs(m) <= l;
}

export function radialNorm(n: number, l: number): number {
  return Math.sqrt((8 / (n * n * n)) * (factorial(n - l - 1) / (2 * n * factorial(n + l))));
}

export function radial(n: number, l: number, r: number): number {
  const rho = (2 * r) / n;
  return radialNorm(n, l) * Math.exp(-r / n) * Math.pow(rho, l) * laguerre(n - l - 1, 2 * l + 1, rho);
}

export function psi(n: number, l: number, m: number, r: number, theta: number, phi: number): number {
  return radial(n, l, r) * realYlm(l, m, theta, phi);
}

export const energyHartree = (n: number) => -1 / (2 * n * n);
export const energyEV = (n: number) => energyHartree(n) * HARTREE_EV;
/** ⟨r⟩ = [3n² − l(l+1)] / 2 */
export const meanRadius = (n: number, l: number) => (3 * n * n - l * (l + 1)) / 2;

/** A radius comfortably beyond where r²R² has any weight. */
export const radialCutoff = (n: number) => 6 * n * n + 12;

/** Inverse-CDF table for P(r) = r² R_nl(r)² on [0, rMax]. */
export class RadialSampler {
  readonly r: Float64Array;
  readonly cdf: Float64Array;

  constructor(n: number, l: number, samples = 4096) {
    const rMax = radialCutoff(n);
    this.r = new Float64Array(samples);
    this.cdf = new Float64Array(samples);
    let acc = 0;
    let prev = 0;
    for (let i = 0; i < samples; i++) {
      const r = (rMax * i) / (samples - 1);
      const R = radial(n, l, r);
      const p = r * r * R * R;
      if (i > 0) acc += 0.5 * (p + prev) * (rMax / (samples - 1));
      prev = p;
      this.r[i] = r;
      this.cdf[i] = acc;
    }
    for (let i = 0; i < samples; i++) this.cdf[i] /= acc;
  }

  /** Radius below which the given fraction of the probability lies. */
  quantile(u: number): number {
    const c = this.cdf;
    let lo = 0;
    let hi = c.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (c[mid] < u) lo = mid;
      else hi = mid;
    }
    const f = (u - c[lo]) / Math.max(c[hi] - c[lo], 1e-300);
    return this.r[lo] + f * (this.r[hi] - this.r[lo]);
  }
}

export interface OrbitalSamples {
  /** Cartesian positions in Bohr radii (x, y, z interleaved). */
  positions: Float32Array;
  /** Sign of ψ at each point (+1 / −1). */
  signs: Float32Array;
  /** Radius enclosing 95 % of the probability. */
  r95: number;
}

/**
 * Draw `count` independent positions from |ψ_nlm|². Because |ψ|² = R² · Y², radius and
 * direction are independent: r from r²R² by inverse CDF, direction from Y² by rejection
 * against a uniform-sphere proposal. Exact up to the 4096-point radial table.
 */
export function sampleOrbital(n: number, l: number, m: number, count: number, rng: Rng): OrbitalSamples {
  if (!validQuantumNumbers(n, l, m)) throw new Error(`invalid quantum numbers (${n}, ${l}, ${m})`);
  const radialTable = new RadialSampler(n, l);
  // Bound for the angular rejection step: max Y² over a fine grid, with margin.
  let ymax2 = 0;
  for (let i = 0; i <= 90; i++) {
    for (let j = 0; j < 180; j++) {
      const y = realYlm(l, m, (Math.PI * i) / 90, (2 * Math.PI * j) / 180);
      ymax2 = Math.max(ymax2, y * y);
    }
  }
  ymax2 *= 1.05;
  const positions = new Float32Array(3 * count);
  const signs = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    let theta: number;
    let phi: number;
    let y: number;
    do {
      theta = Math.acos(2 * rng() - 1);
      phi = 2 * Math.PI * rng();
      y = realYlm(l, m, theta, phi);
    } while (rng() * ymax2 >= y * y);
    const r = radialTable.quantile(rng());
    const st = Math.sin(theta);
    positions[3 * k] = r * st * Math.cos(phi);
    positions[3 * k + 1] = r * st * Math.sin(phi);
    positions[3 * k + 2] = r * Math.cos(theta);
    signs[k] = Math.sign(radial(n, l, r) * y) || 1;
  }
  return { positions, signs, r95: radialTable.quantile(0.95) };
}
