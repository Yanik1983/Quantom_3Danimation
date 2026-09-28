import { describe, expect, it } from 'vitest';
import { assocLegendre, orbitalName, realYlm } from './sphericalHarmonics';
import { gaussLegendre } from './quadrature';

describe('associated Legendre functions', () => {
  it('match closed forms (no Condon–Shortley phase)', () => {
    for (const x of [-0.9, -0.3, 0, 0.42, 0.97]) {
      const s = Math.sqrt(1 - x * x);
      expect(assocLegendre(0, 0, x)).toBeCloseTo(1, 14);
      expect(assocLegendre(1, 0, x)).toBeCloseTo(x, 14);
      expect(assocLegendre(1, 1, x)).toBeCloseTo(s, 14);
      expect(assocLegendre(2, 0, x)).toBeCloseTo((3 * x * x - 1) / 2, 14);
      expect(assocLegendre(2, 1, x)).toBeCloseTo(3 * x * s, 14);
      expect(assocLegendre(2, 2, x)).toBeCloseTo(3 * (1 - x * x), 14);
      expect(assocLegendre(3, 0, x)).toBeCloseTo((5 * x ** 3 - 3 * x) / 2, 14);
      expect(assocLegendre(3, 2, x)).toBeCloseTo(15 * x * (1 - x * x), 13);
      expect(assocLegendre(3, 3, x)).toBeCloseTo(15 * s ** 3, 13);
    }
  });

  it('rejects m outside 0…l', () => {
    expect(() => assocLegendre(1, 2, 0.3)).toThrow();
  });
});

describe('real spherical harmonics', () => {
  // Product quadrature: Gauss–Legendre in cos θ × uniform trapezoid in φ is exact for Y·Y′ up to l ≤ 4.
  const { x, w } = gaussLegendre(24);
  const nPhi = 48;
  const lm: [number, number][] = [];
  for (let l = 0; l <= 3; l++) for (let m = -l; m <= l; m++) lm.push([l, m]);

  it('are orthonormal on the sphere for all l ≤ 3', () => {
    for (const [l1, m1] of lm) {
      for (const [l2, m2] of lm) {
        let s = 0;
        for (let i = 0; i < x.length; i++) {
          const th = Math.acos(x[i]);
          for (let j = 0; j < nPhi; j++) {
            const ph = (2 * Math.PI * j) / nPhi;
            s += w[i] * ((2 * Math.PI) / nPhi) * realYlm(l1, m1, th, ph) * realYlm(l2, m2, th, ph);
          }
        }
        expect(s).toBeCloseTo(l1 === l2 && m1 === m2 ? 1 : 0, 10);
      }
    }
  });

  it('are positive along their named directions', () => {
    expect(realYlm(1, 1, Math.PI / 2, 0)).toBeGreaterThan(0); // p_x on +x
    expect(realYlm(1, -1, Math.PI / 2, Math.PI / 2)).toBeGreaterThan(0); // p_y on +y
    expect(realYlm(1, 0, 0, 0)).toBeGreaterThan(0); // p_z on +z
    expect(realYlm(2, -2, Math.PI / 2, Math.PI / 4)).toBeGreaterThan(0); // d_xy on x = y
    expect(realYlm(2, 2, Math.PI / 2, Math.PI / 2)).toBeLessThan(0); // d_x²−y² negative on y
    expect(orbitalName(3, 2, -2)).toEqual({ main: '3d', sub: 'xy' });
  });
});
