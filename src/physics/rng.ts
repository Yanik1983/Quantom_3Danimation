/**
 * Seeded pseudo-random number generation.
 *
 * Every stochastic physics routine takes an `Rng` so results are reproducible in tests.
 * mulberry32: 32-bit state, period 2^32, passes practical statistical tests for our use
 * (Born-rule sampling, Monte Carlo point clouds). Not cryptographic.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal deviate via Box–Muller (uses two uniforms, returns one). */
export function gaussian(rng: Rng): number {
  let u = rng();
  while (u <= 1e-300) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
