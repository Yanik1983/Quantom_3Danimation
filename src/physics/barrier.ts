/**
 * Scattering from a rectangular barrier V(x) = V₀ for |x| < a/2 (ℏ = m = 1, E = k²/2).
 *
 *   E < V₀:  T = [1 + V₀² sinh²(κa) / (4E(V₀ − E))]⁻¹,   κ = √(2(V₀ − E))
 *   E > V₀:  T = [1 + V₀² sin²(k₂a) / (4E(E − V₀))]⁻¹,   k₂ = √(2(E − V₀))
 *   E = V₀:  T = [1 + V₀a²/2]⁻¹
 */
export function transmission(E: number, V0: number, a: number): number {
  if (E <= 0) return 0;
  if (V0 === 0 || a === 0) return 1;
  const d = E - V0;
  if (Math.abs(d) < 1e-9 * Math.max(1, Math.abs(V0))) return 1 / (1 + (V0 * a * a) / 2);
  if (d < 0) {
    const s = Math.sinh(Math.sqrt(-2 * d) * a);
    return 1 / (1 + (V0 * V0 * s * s) / (4 * E * -d));
  }
  const s = Math.sin(Math.sqrt(2 * d) * a);
  return 1 / (1 + (V0 * V0 * s * s) / (4 * E * d));
}

/** |φ(k)|² of a Gaussian packet with mean k₀ and position spread σ (momentum spread 1/2σ). */
function momentumDensity(k: number, k0: number, sigma: number): number {
  const sk = 1 / (2 * sigma);
  return Math.exp(-((k - k0) ** 2) / (2 * sk * sk)) / (Math.sqrt(2 * Math.PI) * sk);
}

/** Integrate f over the packet's momentum distribution (Simpson, ±8 σ_k, k > 0 only). */
function averageOverPacket(k0: number, sigma: number, f: (k: number) => number): number {
  const sk = 1 / (2 * sigma);
  const lo = Math.max(1e-6, k0 - 8 * sk);
  const hi = k0 + 8 * sk;
  const n = 2000;
  const h = (hi - lo) / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const k = lo + i * h;
    const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
    s += w * momentumDensity(k, k0, sigma) * f(k);
  }
  return (s * h) / 3;
}

/** Transmission probability of a Gaussian packet: ∫ |φ(k)|² T(k²/2) dk. */
export function packetTransmission(k0: number, sigma: number, V0: number, a: number): number {
  return averageOverPacket(k0, sigma, (k) => transmission((k * k) / 2, V0, a));
}

/** What classical mechanics predicts: only momentum components with E > V₀ get through. */
export function classicalTransmission(k0: number, sigma: number, V0: number): number {
  return averageOverPacket(k0, sigma, (k) => ((k * k) / 2 > V0 ? 1 : 0));
}
