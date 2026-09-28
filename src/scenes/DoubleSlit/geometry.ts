/** Mapping between simulation coordinates (ℏ = m = 1 units) and the scene's local space. */

/** Part of the simulation box shown on screen (inside the absorbing edge layers). */
export const REGION = { x0: -17, x1: 14.5, y0: -14, y1: 14 } as const;
/** World units per simulation unit. */
export const S = 0.3;
export const TEX_W = 224;
export const TEX_H = 96;

const X_MID = (REGION.x0 + REGION.x1) / 2;

/** Propagation (sim x) runs away from the camera along −z; transverse (sim y) along world x. */
export const simXToZ = (x: number) => -(x - X_MID) * S;
export const simYToX = (y: number) => y * S;

export const PLANE_WIDTH = (REGION.y1 - REGION.y0) * S;
export const PLANE_DEPTH = (REGION.x1 - REGION.x0) * S;
export const SCREEN_HEIGHT = 3.2;
export const HIST_BINS = 112;

/** Texture-space s coordinate (along propagation) of a simulation x. */
export const simXToS = (x: number) => (x - REGION.x0) / (REGION.x1 - REGION.x0);
