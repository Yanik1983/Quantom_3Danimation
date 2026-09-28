/**
 * The zoom lens spans six powers of ten, from a 0.1 mm grain of fine sand to a 0.1 nm atom
 * (the "million times smaller" in the text).
 * APPROX: the lens shows three pictures (the grain, the atoms in it, one atom) and
 * blends between them; the size label is exact, the picture between stops is not to scale.
 */
export const SIZE_DECADES = 6;

/** Width of the field of view in metres at zoom z ∈ [0, 1]. */
export const fieldOfView = (z: number) => 1e-4 * Math.pow(10, -SIZE_DECADES * z);

export function formatLength(m: number): string {
  const units: [number, string][] = [
    [1e-3, 'mm'],
    [1e-6, 'µm'],
    [1e-9, 'nm'],
  ];
  for (const [u, name] of units) {
    if (m >= u * 0.9999) {
      const v = m / u;
      return `${v >= 10 ? Math.round(v) : v.toPrecision(v < 1 ? 1 : 2).replace(/\.0$/, '')} ${name}`;
    }
  }
  return `${(m / 1e-9).toPrecision(1)} nm`;
}

export function zoomLabel(z: number): string {
  const what = z < 0.4 ? 'a grain of sand' : z < 0.86 ? 'atoms inside the grain' : 'one atom';
  return `${formatLength(fieldOfView(z))}: ${what}`;
}

/** Picture stops: the zoom at which each picture exactly fills the lens. */
export const STAGE_CENTERS = [0.08, 0.62, 1.0] as const;
/** How fast each picture grows with zoom (e-folds per unit of the slider). */
export const STAGE_GROWTH = 5;
