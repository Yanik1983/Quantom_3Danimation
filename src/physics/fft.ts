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

interface Tables {
  rev: Uint32Array;
  cos: Float64Array;
  /** sin(−2πk/n) for the forward transform. */
  sinF: Float64Array;
  /** sin(+2πk/n) for the inverse transform. */
  sinI: Float64Array;
}

function tables(n: number): Tables {
  if (!isPowerOfTwo(n)) throw new Error(`FFT size must be a power of two, got ${n}`);
  const rev = new Uint32Array(n);
  const bits = Math.round(Math.log2(n));
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >>> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  const half = Math.max(n >> 1, 1);
  const cos = new Float64Array(half);
  const sinF = new Float64Array(half);
  const sinI = new Float64Array(half);
  for (let k = 0; k < n >> 1; k++) {
    cos[k] = Math.cos((2 * Math.PI * k) / n);
    sinF[k] = -Math.sin((2 * Math.PI * k) / n);
    sinI[k] = -sinF[k];
  }
  return { rev, cos, sinF, sinI };
}

/** In-place 1D transform of n contiguous complex samples starting at float offset o. */
function transform1D(d: Float64Array, o: number, n: number, t: Tables, sin: Float64Array): void {
  if (n < 2) return;
  const { rev, cos } = t;
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      const a = o + 2 * i;
      const b = o + 2 * j;
      let tmp = d[a];
      d[a] = d[b];
      d[b] = tmp;
      tmp = d[a + 1];
      d[a + 1] = d[b + 1];
      d[b + 1] = tmp;
    }
  }
  // Size-2 stage: twiddle is 1.
  for (let a = o; a < o + 2 * n; a += 4) {
    const br = d[a + 2];
    const bi = d[a + 3];
    d[a + 2] = d[a] - br;
    d[a + 3] = d[a + 1] - bi;
    d[a] += br;
    d[a + 1] += bi;
  }
  for (let size = 4; size <= n; size <<= 1) {
    const h = size >> 1;
    const step = n / size;
    for (let k = 0; k < h; k++) {
      const wr = cos[k * step];
      const wi = sin[k * step];
      for (let start = k; start < n; start += size) {
        const a = o + 2 * start;
        const b = a + 2 * h;
        const xr = d[b];
        const xi = d[b + 1];
        const br = xr * wr - xi * wi;
        const bi = xr * wi + xi * wr;
        d[b] = d[a] - br;
        d[b + 1] = d[a + 1] - bi;
        d[a] += br;
        d[a + 1] += bi;
      }
    }
  }
}

export function createFFT(n: number): FFTPlan {
  const t = tables(n);
  return {
    n,
    forward(data, offset = 0) {
      transform1D(data, offset, n, t, t.sinF);
    },
    inverse(data, offset = 0) {
      transform1D(data, offset, n, t, t.sinI);
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

/**
 * Column transform performed as an FFT over *rows as vectors*: every butterfly combines
 * two whole rows, so memory access stays contiguous and each twiddle is loaded once per
 * row pair instead of once per element.
 */
function transformColumns(d: Float64Array, nx: number, ny: number, t: Tables, sin: Float64Array): void {
  const { rev, cos } = t;
  const rowLen = 2 * nx;
  for (let i = 0; i < ny; i++) {
    const j = rev[i];
    if (j > i) {
      const a = i * rowLen;
      const b = j * rowLen;
      for (let x = 0; x < rowLen; x++) {
        const tmp = d[a + x];
        d[a + x] = d[b + x];
        d[b + x] = tmp;
      }
    }
  }
  for (let size = 2; size <= ny; size <<= 1) {
    const h = size >> 1;
    const step = ny / size;
    for (let k = 0; k < h; k++) {
      const wr = cos[k * step];
      const wi = sin[k * step];
      for (let start = k; start < ny; start += size) {
        const a = start * rowLen;
        const b = (start + h) * rowLen;
        if (k === 0) {
          for (let x = 0; x < rowLen; x++) {
            const bv = d[b + x];
            d[b + x] = d[a + x] - bv;
            d[a + x] += bv;
          }
        } else {
          for (let x = 0; x < rowLen; x += 2) {
            const xr = d[b + x];
            const xi = d[b + x + 1];
            const br = xr * wr - xi * wi;
            const bi = xr * wi + xi * wr;
            d[b + x] = d[a + x] - br;
            d[b + x + 1] = d[a + x + 1] - bi;
            d[a + x] += br;
            d[a + x + 1] += bi;
          }
        }
      }
    }
  }
}

/** 2D FFT: contiguous row transforms, then vectorized column transforms. */
export function createFFT2D(nx: number, ny: number): FFT2DPlan {
  const tx = tables(nx);
  const ty = nx === ny ? tx : tables(ny);

  function run(data: ComplexArray, inverse: boolean): void {
    const sx = inverse ? tx.sinI : tx.sinF;
    for (let y = 0; y < ny; y++) transform1D(data, 2 * y * nx, nx, tx, sx);
    transformColumns(data, nx, ny, ty, inverse ? ty.sinI : ty.sinF);
    if (inverse) {
      const s = 1 / (nx * ny);
      for (let i = 0; i < data.length; i++) data[i] *= s;
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
