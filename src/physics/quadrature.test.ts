import { describe, expect, it } from 'vitest';
import { gaussLegendre } from './quadrature';

describe('gaussLegendre', () => {
  it.each([1, 2, 5, 16, 33])('integrates polynomials up to degree 2n−1 exactly (n=%i)', (n) => {
    const { x, w } = gaussLegendre(n);
    for (let d = 0; d <= 2 * n - 1; d++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += w[i] * x[i] ** d;
      const exact = d % 2 === 1 ? 0 : 2 / (d + 1);
      expect(s).toBeCloseTo(exact, 12);
    }
  });
});
