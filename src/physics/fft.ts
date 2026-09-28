/**
 * Iterative radix-2 Cooley–Tukey FFT on interleaved complex data.
 *
 * Convention (matches numpy):
 *   forward:  X_k = Σ_j x_j e^{-2πi jk/N}
 *   inverse:  x_j = (1/N) Σ_k X_k e^{+2πi jk/N}
 *
 * A plan precomputes the bit-reversal permutation and twiddle factors, so transforms
 * allocate nothing — they are called every simulation step inside workers.
 */
import type { ComplexArray } from './complex';

export interface FFTPlan {
  readonly n: number;
  forward(data: ComplexArray, offset?: number): void;
  inverse(data: ComplexArray, offset?: number): void;
}

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export function createFFT(n: number): FFTPlan {
  if (!isPowerOfTwo(n)) throw new Error(`FFT size must be a power of two, got ${n}`);
  const rev = new Uint32Array(n);
  const bits = Math.round(Math.log2(n));
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >>> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  // cos/sin of -2πk/n for k < n/2
  const half = n >> 1;
  const cos = new Float64Array(Math.max(half, 1));
  const sin = new Float64Array(Math.max(half, 1));
  for (let k = 0; k < half; k++) {
    cos[k] = Math.cos((-2 * Math.PI * k) / n);
    sin[k] = Math.sin((-2 * Math.PI * k) / n);
  }

  function transform(d: ComplexArray, o: number, sign: 1 | -1): void {
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) {
        const a = o + 2 * i;
        const b = o + 2 * j;
        let t = d[a];
        d[a] = d[b];
        d[b] = t;
        t = d[a + 1];
        d[a + 1] = d[b + 1];
        d[b + 1] = t;
      }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const h = size >> 1;
      const step = n / size;
      for (let start = 0; start < n; start += size) {
        for (let k = 0; k < h; k++) {
          const wr = cos[k * step];
          const wi = sign * sin[k * step];
          const a = o + 2 * (start + k);
          const b = o + 2 * (start + k + h);
          const br = d[b] * wr - d[b + 1] * wi;
          const bi = d[b] * wi + d[b + 1] * wr;
          d[b] = d[a] - br;
          d[b + 1] = d[a + 1] - bi;
          d[a] += br;
          d[a + 1] += bi;
        }
      }
    }
  }

  return {
    n,
    forward(data, offset = 0) {
      transform(data, offset, 1);
    },
    inverse(data, offset = 0) {
      transform(data, offset, -1);
      const s = 1 / n;
      for (let i = offset; i < offset + 2 * n; i++) data[i] *= s;
    },
  };
}

export interface FFT2DPlan {
  readonly nx: number;
  readonly ny: number;
  /** Row-major data: index (iy * nx + ix). */
  forward(data: ComplexArray): void;
  inverse(data: ComplexArray): void;
}

/** 2D FFT: rows in place, columns via a preallocated scratch column. */
export function createFFT2D(nx: number, ny: number): FFT2DPlan {
  const px = createFFT(nx);
  const py = nx === ny ? px : createFFT(ny);
  const col = new Float64Array(2 * ny);

  function run(data: ComplexArray, inverse: boolean): void {
    for (let y = 0; y < ny; y++) {
      if (inverse) px.inverse(data, 2 * y * nx);
      else px.forward(data, 2 * y * nx);
    }
    for (let x = 0; x < nx; x++) {
      for (let y = 0; y < ny; y++) {
        const i = 2 * (y * nx + x);
        col[2 * y] = data[i];
        col[2 * y + 1] = data[i + 1];
      }
      if (inverse) py.inverse(col);
      else py.forward(col);
      for (let y = 0; y < ny; y++) {
        const i = 2 * (y * nx + x);
        data[i] = col[2 * y];
        data[i + 1] = col[2 * y + 1];
      }
    }
  }

  return {
    nx,
    ny,
    forward: (d) => run(d, false),
    inverse: (d) => run(d, true),
  };
}

/**
 * Angular wavenumbers matching FFT bin order for a grid of n points spaced dx:
 * k_j = 2π/(n dx) · (j for j < n/2, j − n otherwise).
 */
export function fftWavenumbers(n: number, dx: number): Float64Array {
  const k = new Float64Array(n);
  const dk = (2 * Math.PI) / (n * dx);
  for (let j = 0; j < n; j++) k[j] = (j < n / 2 ? j : j - n) * dk;
  return k;
}
