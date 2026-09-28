import type { Color } from 'three';

// Linear-space versions of the brand accents (matching the GLSL phaseColor chunk).
const CYAN = [0.133, 0.894, 1.0];
const VIOLET = [0.545, 0.361, 0.965];
const MAGENTA = [1.0, 0.239, 0.733];

/** CPU twin of the GLSL `phaseColor`: cyclic phase → cyan → violet → magenta → cyan. */
export function phaseColor(phase: number, out: Color): Color {
  let t = phase / (2 * Math.PI) + 0.5;
  t -= Math.floor(t);
  const s = t * 3;
  const [a, b, f] = s < 1 ? [CYAN, VIOLET, s] : s < 2 ? [VIOLET, MAGENTA, s - 1] : [MAGENTA, CYAN, s - 2];
  return out.setRGB(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
}
