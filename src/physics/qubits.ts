/**
 * n identical, unentangled qubits, each in cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩.
 *
 * The joint state is a product state, so the Born probability of a bit string b is
 * Π_i P(b_i) with P(1) = sin²(θ/2), and measuring the register is exactly equivalent
 * to measuring each qubit independently. Bit strings are indexed with qubit 0 as the
 * most significant bit (|q0 q1 … q(n−1)⟩).
 */
import type { Rng } from './rng';

/** Polar angle θ whose |1⟩ probability is p. */
export const thetaForP1 = (p: number): number => 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, p))));

/** Probability of every bit string of n qubits that each have P(1) = p1. Length 2ⁿ. */
export function productDistribution(n: number, p1: number): Float64Array {
  const out = new Float64Array(1 << n);
  for (let s = 0; s < out.length; s++) {
    let p = 1;
    for (let q = 0; q < n; q++) p *= (s >> (n - 1 - q)) & 1 ? p1 : 1 - p1;
    out[s] = p;
  }
  return out;
}

/** Measure all n qubits: one Born sample per qubit. Returns the outcome bits (0 or 1). */
export function measureAll(n: number, p1: number, rng: Rng): number[] {
  const bits: number[] = [];
  for (let q = 0; q < n; q++) bits.push(rng() < p1 ? 1 : 0);
  return bits;
}

/** Index of a bit string in productDistribution. */
export const bitsToIndex = (bits: readonly number[]): number => bits.reduce((s, b) => (s << 1) | b, 0);
