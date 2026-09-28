/**
 * Associated Legendre functions and real spherical harmonics.
 *
 * Convention: no Condon–Shortley phase, so every real harmonic is positive along its
 * named direction (p_x > 0 on +x, d_xy > 0 in the +x+y quadrant, …).
 *
 *   Y_l0      = N_l0 P_l(cosθ)
 *   Y_lm, m>0 = √2 N_lm P_l^m(cosθ) cos(mφ)
 *   Y_lm, m<0 = √2 N_l|m| P_l^|m|(cosθ) sin(|m|φ)
 *   N_lm      = √[(2l+1)/(4π) · (l−m)!/(l+m)!]
 */

/** P_l^m(x) for 0 ≤ m ≤ l, via the standard stable upward recurrence in l. */
export function assocLegendre(l: number, m: number, x: number): number {
  if (m < 0 || m > l) throw new Error(`need 0 ≤ m ≤ l, got l=${l}, m=${m}`);
  // P_m^m = (2m−1)!! (1−x²)^{m/2}
  let pmm = 1;
  const s = Math.sqrt(Math.max(0, (1 - x) * (1 + x)));
  for (let i = 1; i <= m; i++) pmm *= (2 * i - 1) * s;
  if (l === m) return pmm;
  let pmm1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmm1;
  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = (x * (2 * ll - 1) * pmm1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmm1;
    pmm1 = pll;
  }
  return pll;
}

function factorialRatio(a: number, b: number): number {
  // a! / b!
  let r = 1;
  if (a >= b) for (let i = b + 1; i <= a; i++) r *= i;
  else for (let i = a + 1; i <= b; i++) r /= i;
  return r;
}

export function ylmNorm(l: number, m: number): number {
  const am = Math.abs(m);
  return Math.sqrt(((2 * l + 1) / (4 * Math.PI)) * factorialRatio(l - am, l + am));
}

/** Real spherical harmonic Y_lm(θ, φ). */
export function realYlm(l: number, m: number, theta: number, phi: number): number {
  const am = Math.abs(m);
  const p = assocLegendre(l, am, Math.cos(theta));
  const n = ylmNorm(l, m);
  if (m === 0) return n * p;
  return Math.SQRT2 * n * p * (m > 0 ? Math.cos(am * phi) : Math.sin(am * phi));
}

/** Real Y_lm at a unit direction (x, y, z) — avoids trig for points already in Cartesian form. */
export function realYlmXYZ(l: number, m: number, x: number, y: number, z: number): number {
  const phi = Math.atan2(y, x);
  const theta = Math.acos(Math.max(-1, Math.min(1, z)));
  return realYlm(l, m, theta, phi);
}

const L_NAMES = ['s', 'p', 'd', 'f', 'g'];
const M_NAMES: Record<number, Record<number, string>> = {
  0: { 0: '' },
  1: { [-1]: 'y', 0: 'z', 1: 'x' },
  2: { [-2]: 'xy', [-1]: 'yz', 0: 'z²', 1: 'xz', 2: 'x²−y²' },
  3: { [-3]: 'y(3x²−y²)', [-2]: 'xyz', [-1]: 'yz²', 0: 'z³', 1: 'xz²', 2: 'z(x²−y²)', 3: 'x(x²−3y²)' },
};

/** Chemistry name of a real hydrogen orbital, e.g. "3d_xy". */
export function orbitalName(n: number, l: number, m: number): { main: string; sub: string } {
  return { main: `${n}${L_NAMES[l] ?? '?'}`, sub: M_NAMES[l]?.[m] ?? '' };
}
