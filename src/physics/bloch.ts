/**
 * A single qubit and projective measurements on it.
 *
 *   |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩   ↔   r = (sinθ cosφ, sinθ sinφ, cosθ)
 *
 * (global phase dropped). Measuring along axis n̂ gives ±1 with Born probabilities
 * P± = |⟨±n̂|ψ⟩|² = (1 ± r·n̂)/2 and leaves the qubit in |±n̂⟩.
 */
import type { Rng } from './rng';

export type Basis = 'z' | 'x' | 'y';

export interface Complex {
  re: number;
  im: number;
}

export interface Qubit {
  theta: number;
  phi: number;
}

export const BASIS_AXIS: Record<Basis, readonly [number, number, number]> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};

/** Labels of the (+, −) eigenstates of each measurement. */
export const BASIS_KETS: Record<Basis, readonly [string, string]> = {
  z: ['0', '1'],
  x: ['+', '−'],
  y: ['+i', '−i'],
};

export function blochVector(q: Qubit): [number, number, number] {
  const s = Math.sin(q.theta);
  return [s * Math.cos(q.phi), s * Math.sin(q.phi), Math.cos(q.theta)];
}

/** Computational-basis amplitudes (α, β). */
export function amplitudes(q: Qubit): [Complex, Complex] {
  const c = Math.cos(q.theta / 2);
  const s = Math.sin(q.theta / 2);
  return [
    { re: c, im: 0 },
    { re: s * Math.cos(q.phi), im: s * Math.sin(q.phi) },
  ];
}

/**
 * Amplitudes ⟨+n̂|ψ⟩ and ⟨−n̂|ψ⟩ in the given basis, with
 * |±x⟩ = (|0⟩ ± |1⟩)/√2 and |±y⟩ = (|0⟩ ± i|1⟩)/√2.
 */
export function basisAmplitudes(q: Qubit, basis: Basis): [Complex, Complex] {
  const [a, b] = amplitudes(q);
  const r = Math.SQRT1_2;
  switch (basis) {
    case 'z':
      return [a, b];
    case 'x':
      return [
        { re: r * (a.re + b.re), im: r * (a.im + b.im) },
        { re: r * (a.re - b.re), im: r * (a.im - b.im) },
      ];
    case 'y':
      // ⟨±y| = (⟨0| ∓ i⟨1|)/√2  →  (α ∓ iβ)/√2
      return [
        { re: r * (a.re + b.im), im: r * (a.im - b.re) },
        { re: r * (a.re - b.im), im: r * (a.im + b.re) },
      ];
  }
}

export const abs2 = (c: Complex) => c.re * c.re + c.im * c.im;
export const arg = (c: Complex) => Math.atan2(c.im, c.re);

/** Born probability of the + outcome along the basis axis: (1 + r·n̂)/2. */
export function probabilityPlus(q: Qubit, basis: Basis): number {
  const r = blochVector(q);
  const n = BASIS_AXIS[basis];
  return 0.5 * (1 + r[0] * n[0] + r[1] * n[1] + r[2] * n[2]);
}

/** The eigenstate |±n̂⟩ as Bloch angles. */
export function eigenstate(basis: Basis, plus: boolean): Qubit {
  switch (basis) {
    case 'z':
      return plus ? { theta: 0, phi: 0 } : { theta: Math.PI, phi: 0 };
    case 'x':
      return { theta: Math.PI / 2, phi: plus ? 0 : Math.PI };
    case 'y':
      return { theta: Math.PI / 2, phi: plus ? Math.PI / 2 : (3 * Math.PI) / 2 };
  }
}

export interface MeasurementResult {
  plus: boolean;
  /** State after the measurement. */
  after: Qubit;
  /** Probability the + outcome had. */
  pPlus: number;
}

/** Projective measurement: inverse-CDF sampling of the Born distribution. */
export function measure(q: Qubit, basis: Basis, rng: Rng): MeasurementResult {
  const pPlus = probabilityPlus(q, basis);
  const plus = rng() < pPlus;
  return { plus, after: eigenstate(basis, plus), pPlus };
}

/** Convert a Bloch direction (any length > 0) back to angles. */
export function fromVector(x: number, y: number, z: number): Qubit {
  const r = Math.hypot(x, y, z);
  const theta = Math.acos(Math.max(-1, Math.min(1, z / r)));
  let phi = Math.atan2(y, x);
  if (phi < 0) phi += 2 * Math.PI;
  return { theta, phi };
}
