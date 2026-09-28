/**
 * Uniform grids. Units throughout the wave-packet scenes: ℏ = m = 1, so
 * E = k²/2, group velocity v = k, de Broglie wavelength λ = 2π/k.
 */
export interface Grid1D {
  readonly n: number;
  readonly dx: number;
  /** Coordinate of sample 0; x_i = x0 + i·dx. */
  readonly x0: number;
}

export interface Grid2D {
  readonly nx: number;
  readonly ny: number;
  readonly dx: number;
  readonly dy: number;
  readonly x0: number;
  readonly y0: number;
}

/** Grid of n points centred on 0 spanning [−L/2, L/2). */
export function centeredGrid1D(n: number, length: number): Grid1D {
  const dx = length / n;
  return { n, dx, x0: -length / 2 };
}

export function centeredGrid2D(nx: number, ny: number, lx: number, ly: number): Grid2D {
  return { nx, ny, dx: lx / nx, dy: ly / ny, x0: -lx / 2, y0: -ly / 2 };
}

export function xAt(g: Grid1D, i: number): number {
  return g.x0 + i * g.dx;
}
