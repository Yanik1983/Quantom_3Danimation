/**
 * Sampling from discrete probability distributions — the Born rule made concrete.
 *
 * AliasTable (Vose's method): O(n) build, O(1) per sample, so thousands of detector
 * hits per frame cost almost nothing.
 */
import type { Rng } from './rng';

export class AliasTable {
  readonly n: number;
  private readonly prob: Float64Array;
  private readonly alias: Uint32Array;

  constructor(weights: ArrayLike<number>) {
    const n = weights.length;
    if (n === 0) throw new Error('AliasTable needs at least one weight');
    this.n = n;
    this.prob = new Float64Array(n);
    this.alias = new Uint32Array(n);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const w = weights[i];
      if (!(w >= 0) || !Number.isFinite(w)) throw new Error(`Invalid weight at ${i}: ${w}`);
      total += w;
    }
    if (total <= 0) throw new Error('AliasTable weights sum to zero');
    const scaled = new Float64Array(n);
    const small = new Uint32Array(n);
    const large = new Uint32Array(n);
    let ns = 0;
    let nl = 0;
    for (let i = 0; i < n; i++) {
      scaled[i] = (weights[i] * n) / total;
      if (scaled[i] < 1) small[ns++] = i;
      else large[nl++] = i;
    }
    while (ns > 0 && nl > 0) {
      const s = small[--ns];
      const l = large[--nl];
      this.prob[s] = scaled[s];
      this.alias[s] = l;
      scaled[l] = scaled[l] + scaled[s] - 1;
      if (scaled[l] < 1) small[ns++] = l;
      else large[nl++] = l;
    }
    while (nl > 0) this.prob[large[--nl]] = 1;
    while (ns > 0) this.prob[small[--ns]] = 1; // numerical leftovers
  }

  sample(rng: Rng): number {
    const i = Math.floor(rng() * this.n);
    return rng() < this.prob[i] ? i : this.alias[i];
  }
}

/** Normalized cumulative distribution for inverse-CDF sampling / plotting. */
export function cumulative(weights: ArrayLike<number>): Float64Array {
  const c = new Float64Array(weights.length);
  let s = 0;
  for (let i = 0; i < weights.length; i++) {
    s += weights[i];
    c[i] = s;
  }
  for (let i = 0; i < c.length; i++) c[i] /= s;
  return c;
}
