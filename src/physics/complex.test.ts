import { describe, expect, it } from 'vitest';
import { abs2Into, complexArray, inner, norm2, normalize } from './complex';

describe('complex helpers', () => {
  it('normalizes with a measure', () => {
    const psi = complexArray(4);
    psi.set([1, 1, 2, 0, 0, -1, 0, 0]);
    normalize(psi, 0.5);
    expect(norm2(psi, 0.5)).toBeCloseTo(1, 14);
  });

  it('computes ⟨a|b⟩ with conjugation on the bra', () => {
    const a = new Float64Array([0, 1]); // i
    const b = new Float64Array([1, 0]); // 1
    const out = [0, 0];
    inner(a, b, 1, out);
    expect(out).toEqual([0, -1]); // conj(i)·1 = −i
  });

  it('writes |ψ|²', () => {
    const psi = new Float64Array([3, 4, 1, 0]);
    const out = new Float32Array(2);
    abs2Into(psi, out);
    expect(Array.from(out)).toEqual([25, 1]);
  });
});
