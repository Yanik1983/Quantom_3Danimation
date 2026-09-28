export type OrbitalRequest =
  | { type: 'sample'; id: number; n: number; l: number; m: number; count: number; seed: number }
  | {
      type: 'slice';
      id: number;
      n: number;
      l: number;
      m: number;
      /** Plane y = y0 in atomic units (the plane spanned by x and z). */
      y0: number;
      /** Half-width of the square slice, atomic units. */
      extent: number;
      res: number;
    };

export type OrbitalResponse =
  | { type: 'sample'; id: number; positions: Float32Array; signs: Float32Array; r95: number }
  | {
      type: 'slice';
      id: number;
      /** Half-float ψ/max|ψ| on a res × res grid (row = z, column = x). */
      data: Uint16Array;
      res: number;
    };
