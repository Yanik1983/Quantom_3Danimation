/**
 * A small quantum register (state-vector simulation). Amplitudes are interleaved complex
 * over the 2ⁿ computational basis states |b_{n−1} … b_0⟩ (index = binary value).
 */
import type { Rng } from './rng';

export class QRegister {
  readonly n: number;
  readonly size: number;
  readonly amp: Float64Array;

  constructor(n: number) {
    this.n = n;
    this.size = 1 << n;
    this.amp = new Float64Array(2 * this.size);
    this.reset();
  }

  /** |00…0⟩ */
  reset(): void {
    this.amp.fill(0);
    this.amp[0] = 1;
  }

  /** Hadamard on qubit q: |0⟩ → (|0⟩+|1⟩)/√2, |1⟩ → (|0⟩−|1⟩)/√2. */
  hadamard(q: number): void {
    const bit = 1 << q;
    const r = Math.SQRT1_2;
    for (let i = 0; i < this.size; i++) {
      if (i & bit) continue;
      const j = i | bit;
      const ar = this.amp[2 * i];
      const ai = this.amp[2 * i + 1];
      const br = this.amp[2 * j];
      const bi = this.amp[2 * j + 1];
      this.amp[2 * i] = r * (ar + br);
      this.amp[2 * i + 1] = r * (ai + bi);
      this.amp[2 * j] = r * (ar - br);
      this.amp[2 * j + 1] = r * (ai - bi);
    }
  }

  hadamardAll(): void {
    for (let q = 0; q < this.n; q++) this.hadamard(q);
  }

  /** Grover oracle: flip the sign of the marked basis state. */
  oracle(marked: number): void {
    this.amp[2 * marked] *= -1;
    this.amp[2 * marked + 1] *= -1;
  }

  /** Grover diffusion 2|s⟩⟨s| − I: reflect every amplitude about the mean. */
  diffuse(): void {
    let mr = 0;
    let mi = 0;
    for (let i = 0; i < this.size; i++) {
      mr += this.amp[2 * i];
      mi += this.amp[2 * i + 1];
    }
    mr /= this.size;
    mi /= this.size;
    for (let i = 0; i < this.size; i++) {
      this.amp[2 * i] = 2 * mr - this.amp[2 * i];
      this.amp[2 * i + 1] = 2 * mi - this.amp[2 * i + 1];
    }
  }

  probability(i: number): number {
    return this.amp[2 * i] ** 2 + this.amp[2 * i + 1] ** 2;
  }

  /** Born-rule measurement of all qubits; collapses the register to the outcome. */
  measure(rng: Rng): number {
    let u = rng();
    let outcome = this.size - 1;
    for (let i = 0; i < this.size; i++) {
      u -= this.probability(i);
      if (u < 0) {
        outcome = i;
        break;
      }
    }
    this.amp.fill(0);
    this.amp[2 * outcome] = 1;
    return outcome;
  }
}

/** Grover success probability after k iterations on N items: sin²((2k+1)θ), sin θ = 1/√N. */
export function groverSuccess(N: number, k: number): number {
  const theta = Math.asin(1 / Math.sqrt(N));
  return Math.sin((2 * k + 1) * theta) ** 2;
}

/** Optimal number of Grover iterations: ⌊π/(4θ)⌋. */
export function groverOptimalIterations(N: number): number {
  return Math.floor(Math.PI / (4 * Math.asin(1 / Math.sqrt(N))));
}
