/**
 * Bell tests on a spin singlet |ψ⁻⟩ = (|↑↓⟩ − |↓↑⟩)/√2, with spin measurements along
 * directions at angles a (Alice) and b (Bob) in one plane. Outcomes are ±1.
 *
 *   Quantum:  P(A = B) = sin²((a−b)/2),  E(a, b) = ⟨AB⟩ = −cos(a − b)
 *
 * Local hidden-variable (LHV) model used for comparison: each pair carries a shared
 * random angle λ; A = sgn cos(a − λ), B = −sgn cos(b − λ). It reproduces the perfect
 * anticorrelation at equal settings and gives E = −1 + 2|Δ|/π — the best a local
 * "instruction set" can do along these lines. By Bell's theorem, no LHV model can
 * exceed |S| = 2 (CHSH) or push Mermin agreement below 5/9.
 */
import type { Rng } from './rng';

/** Wrap an angle difference into [0, π]. */
export function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

export const quantumCorrelation = (a: number, b: number) => -Math.cos(a - b);
export const lhvCorrelation = (a: number, b: number) => -1 + (2 * angleDiff(a, b)) / Math.PI;

/** One entangled pair measured at (a, b): Born-rule sampling of the joint outcome. */
export function singletOutcome(a: number, b: number, rng: Rng): [number, number] {
  const A = rng() < 0.5 ? 1 : -1;
  const pSame = Math.sin((a - b) / 2) ** 2;
  return [A, rng() < pSame ? A : -A];
}

/** One pair from the local hidden-variable model. */
export function lhvOutcome(a: number, b: number, rng: Rng): [number, number] {
  const lambda = 2 * Math.PI * rng();
  return [Math.cos(a - lambda) >= 0 ? 1 : -1, Math.cos(b - lambda) >= 0 ? -1 : 1];
}

export interface CHSHSettings {
  a: [number, number];
  b: [number, number];
}

/** Settings that maximize the quantum violation: |S| = 2√2. */
export const CHSH_OPTIMAL: CHSHSettings = { a: [0, Math.PI / 2], b: [Math.PI / 4, (3 * Math.PI) / 4] };

/** S = E(a,b) − E(a,b′) + E(a′,b) + E(a′,b′). Local realism requires |S| ≤ 2. */
export function chsh(e: (i: number, j: number) => number): number {
  return e(0, 0) - e(0, 1) + e(1, 0) + e(1, 1);
}

/** Mermin's three settings, 120° apart, used by both sides. */
export const MERMIN_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3] as const;
/** With random settings, "agree" means opposite spins (A = −B). */
export const MERMIN_CLASSICAL_MIN = 5 / 9;
export const MERMIN_QUANTUM = 1 / 2;
