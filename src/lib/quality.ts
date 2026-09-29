export type Tier = 'low' | 'medium' | 'high';
export const TIERS: readonly Tier[] = ['low', 'medium', 'high'];

export interface TierParams {
  /** Device-pixel-ratio clamp passed to the Canvas. */
  dpr: [number, number];
  bloom: boolean;
  chromatic: boolean;
  depthOfField: boolean;
  /** Multiplier for particle / point-cloud counts in scenes. */
  particleScale: number;
  /** Multiplier (power-of-two friendly) for simulation grid resolution. */
  gridScale: 0.5 | 1;
  /** Glass cards use backdrop blur (costly over a live WebGL canvas). */
  blur: boolean;
}

export const TIER_PARAMS: Record<Tier, TierParams> = {
  low: {
    dpr: [0.75, 1],
    bloom: true,
    chromatic: false,
    depthOfField: false,
    particleScale: 0.3,
    gridScale: 0.5,
    blur: false,
  },
  medium: {
    dpr: [1, 1.5],
    bloom: true,
    chromatic: true,
    depthOfField: false,
    particleScale: 0.6,
    gridScale: 1,
    blur: true,
  },
  high: {
    dpr: [1, 2],
    bloom: true,
    chromatic: true,
    depthOfField: true,
    particleScale: 1,
    gridScale: 1,
    blur: true,
  },
};

export function stepTier(t: Tier, dir: 1 | -1): Tier {
  const i = TIERS.indexOf(t) + dir;
  return TIERS[Math.max(0, Math.min(TIERS.length - 1, i))];
}

/**
 * First guess before any frame timing is available. Frame-time monitoring then
 * adjusts it (see QualityGovernor).
 */
export function guessInitialTier(renderer: string | null): Tier {
  if (typeof navigator === 'undefined') return 'medium';
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const r = (renderer ?? '').toLowerCase();
  if (/swiftshader|llvmpipe|software|basic render/.test(r)) return 'low';
  if (coarse) return cores >= 8 && mem >= 6 ? 'medium' : 'low';
  if (/intel|mali|adreno|powervr/.test(r) || cores <= 4) return 'medium';
  return 'high';
}
