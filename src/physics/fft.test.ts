import { describe, expect, it } from 'vitest';
import { createFFT, createFFT2D, fftWavenumbers } from './fft';
import { mulberry32 } from './rng';
import { sumAbs2 } from './complex';

function naiveDFT(x: Float64Array): Float64Array {
  const n = x.length / 2;
  const out = new Float64Array(2 * n);
  for (let k = 0; k < n; k++) {
    let re = 0;
    let im = 0;
    for (let j = 0; j < n; j++) {
      const a = (-2 * Math.PI * j * k) / n;
      re += x[2 * j] * Math.cos(a) - x[2 * j + 1] * Math.sin(a);
      im += x[2 * j] * Math.sin(a) + x[2 * j + 1] * Math.cos(a);
    }
    out[2 * k] = re;
    out[2 * k + 1] = im;
  }
  return out;
}

function randomSignal(n: number, seed: number): Float64Array {
  const rng = mulberry32(seed);
  const x = new Float64Array(2 * n);
  for (let i = 0; i < x.length; i++) x[i] = rng() * 2 - 1;
  return x;
}

describe('fft', () => {
  it.each([1, 2, 8, 64, 256])('matches a naive DFT for n=%i', (n) => {
    const x = randomSignal(n, n);
    const expected = naiveDFT(x);
    const y = x.slice();
    createFFT(n).forward(y);
    for (let i = 0; i < y.length; i++) expect(y[i]).toBeCloseTo(expected[i], 9);
  });

  it('inverse undoes forward', () => {
    const x = randomSignal(512, 7);
    const y = x.slice();
    const p = createFFT(512);
    p.forward(y);
    p.inverse(y);
    for (let i = 0; i < y.length; i++) expect(y[i]).toBeCloseTo(x[i], 12);
  });

  it('satisfies Parseval: Σ|x|² = (1/N) Σ|X|²', () => {
    const n = 1024;
    const x = randomSignal(n, 3);
    const y = x.slice();
    createFFT(n).forward(y);
    expect(sumAbs2(y) / n).toBeCloseTo(sumAbs2(x), 9);
  });

  it('respects an offset into a larger buffer', () => {
    const n = 16;
    const x = randomSignal(n, 11);
    const big = new Float64Array(6 * n);
    big.set(x, 2 * n);
    createFFT(n).forward(big, 2 * n);
    const expected = naiveDFT(x);
    for (let i = 0; i < 2 * n; i++) expect(big[2 * n + i]).toBeCloseTo(expected[i], 9);
    expect(big[0]).toBe(0);
    expect(big[4 * n]).toBe(0);
  });

  it('rejects non-power-of-two sizes', () => {
    expect(() => createFFT(12)).toThrow();
  });

  it('transforms a pure tone into a single bin', () => {
    const n = 64;
    const m = 5;
    const x = new Float64Array(2 * n);
    for (let j = 0; j < n; j++) {
      x[2 * j] = Math.cos((2 * Math.PI * m * j) / n);
      x[2 * j + 1] = Math.sin((2 * Math.PI * m * j) / n);
    }
    createFFT(n).forward(x);
    for (let k = 0; k < n; k++) {
      const mag = Math.hypot(x[2 * k], x[2 * k + 1]);
      expect(mag).toBeCloseTo(k === m ? n : 0, 8);
    }
  });
});

describe('fft2d', () => {
  it('equals row DFTs followed by column DFTs, and round-trips', () => {
    const nx = 8;
    const ny = 4;
    const x = randomSignal(nx * ny, 5);
    const y = x.slice();
    const p = createFFT2D(nx, ny);
    p.forward(y);
    // Check the DC term = sum of all samples.
    let re = 0;
    let im = 0;
    for (let i = 0; i < x.length; i += 2) {
      re += x[i];
      im += x[i + 1];
    }
    expect(y[0]).toBeCloseTo(re, 10);
    expect(y[1]).toBeCloseTo(im, 10);
    p.inverse(y);
    for (let i = 0; i < y.length; i++) expect(y[i]).toBeCloseTo(x[i], 12);
  });
});

describe('fftWavenumbers', () => {
  it('uses FFT bin ordering', () => {
    const k = fftWavenumbers(8, 0.5);
    const dk = (2 * Math.PI) / 4;
    expect(Array.from(k)).toEqual([0, 1, 2, 3, -4, -3, -2, -1].map((j) => j * dk));
  });
});
