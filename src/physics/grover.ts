/**
 * Grover search on n qubits: N = 2ⁿ items, one of them marked.
 *
 * Every step keeps the amplitudes real, so the state is a Float64Array of N real numbers
 * indexed by bit string (qubit 0 most significant, as in qubits.ts).
 * - Start: H^⊗n |0…0⟩ = |s⟩ = (1/√N) Σₓ |x⟩, an even mix of every item.
 * - Oracle O: |x⟩ → −|x⟩ for the marked x. It recognises the answer but does not reveal it:
 *   probabilities |aₓ|² are unchanged.
 * - Diffusion D = 2|s⟩⟨s| − I: every amplitude is reflected about the mean, aₓ → 2ā − aₓ.
 * After k rounds of D·O, P(marked) = sin²((2k + 1)θ) with sin θ = 1/√N; for N = 4 a single
 * round gives exactly 1.
 */
import type { Rng } from './rng';

/** Even mix of all 2ⁿ items (the state after a Hadamard on every qubit). */
export function uniform(n: number): Float64Array {
  const N = 1 << n;
  return new Float64Array(N).fill(1 / Math.sqrt(N));
}

/** Writes the even mix into an existing state (no allocation). */
export function setUniform(state: Float64Array): void {
  state.fill(1 / Math.sqrt(state.length));
}

/** The oracle: flip the sign of the marked item's amplitude (in place). */
export function oracle(state: Float64Array, marked: number): void {
  state[marked] = -state[marked];
}

/** Inversion about the mean, 2|s⟩⟨s| − I (in place). */
export function diffuse(state: Float64Array): void {
  let mean = 0;
  for (let i = 0; i < state.length; i++) mean += state[i];
  mean /= state.length;
  for (let i = 0; i < state.length; i++) state[i] = 2 * mean - state[i];
}

/** Born probabilities |aₓ|². */
export function probabilities(state: Float64Array, out = new Float64Array(state.length)): Float64Array {
  for (let i = 0; i < state.length; i++) out[i] = state[i] * state[i];
  return out;
}

/** Analytic success probability after k Grover rounds on N items. */
export function successProbability(N: number, k: number): number {
  const theta = Math.asin(1 / Math.sqrt(N));
  return Math.sin((2 * k + 1) * theta) ** 2;
}

/** Number of rounds that maximises the success probability, ⌊π / (4θ)⌋ ≈ (π/4)√N. */
export function optimalRounds(N: number): number {
  return Math.floor(Math.PI / (4 * Math.asin(1 / Math.sqrt(N))));
}

/** Measure the register: one Born-rule sample of an item index. */
export function measureIndex(state: Float64Array, rng: Rng): number {
  const u = rng();
  let acc = 0;
  for (let i = 0; i < state.length; i++) {
    acc += state[i] * state[i];
    if (u < acc) return i;
  }
  return state.length - 1; // rounding leftovers
}
