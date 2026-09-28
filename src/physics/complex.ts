/**
 * Complex arrays are stored interleaved in a Float64Array: [re0, im0, re1, im1, ...].
 * This keeps them transferable to workers and cache-friendly for the FFT.
 */
export type ComplexArray = Float64Array;

export function complexArray(n: number): ComplexArray {
  return new Float64Array(2 * n);
}

/** Σ |ψ_j|² (no measure). */
export function sumAbs2(psi: ComplexArray): number {
  let s = 0;
  for (let i = 0; i < psi.length; i += 2) s += psi[i] * psi[i] + psi[i + 1] * psi[i + 1];
  return s;
}

/** Discrete norm ∫|ψ|² ≈ Σ |ψ_j|² · dV. */
export function norm2(psi: ComplexArray, dV: number): number {
  return sumAbs2(psi) * dV;
}

/** Scale ψ in place so that Σ|ψ_j|² dV = 1. Returns the previous norm². */
export function normalize(psi: ComplexArray, dV: number): number {
  const n = norm2(psi, dV);
  if (n > 0) {
    const s = 1 / Math.sqrt(n);
    for (let i = 0; i < psi.length; i++) psi[i] *= s;
  }
  return n;
}

/** ⟨a|b⟩ = Σ conj(a_j) b_j dV, written into out[0..1]. */
export function inner(a: ComplexArray, b: ComplexArray, dV: number, out: Float64Array | number[]): void {
  let re = 0;
  let im = 0;
  for (let i = 0; i < a.length; i += 2) {
    const ar = a[i];
    const ai = a[i + 1];
    const br = b[i];
    const bi = b[i + 1];
    re += ar * br + ai * bi;
    im += ar * bi - ai * br;
  }
  out[0] = re * dV;
  out[1] = im * dV;
}

/** |ψ_j|² into a real array (Float32 for GPU upload or Float64 for analysis). */
export function abs2Into(psi: ComplexArray, out: Float32Array | Float64Array): void {
  for (let j = 0, i = 0; j < out.length; j++, i += 2) out[j] = psi[i] * psi[i] + psi[i + 1] * psi[i + 1];
}
