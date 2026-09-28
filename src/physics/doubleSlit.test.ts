import { beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_DOUBLE_SLIT,
  findPeaks,
  fringeVisibility,
  interferenceFactor,
  mirrorRow,
  predictedMaxima,
  runDirect,
  runDoubleSlit,
  type DoubleSlitResult,
} from './doubleSlit';

const cfg = DEFAULT_DOUBLE_SLIT;
let r: DoubleSlitResult;

beforeAll(() => {
  r = runDoubleSlit(cfg);
}, 60_000);

const yAt = (j: number) => r.grid.y0 + j * r.grid.dy;

describe('double slit', () => {
  it('produces normalized, mirror-symmetric screen distributions', () => {
    for (const p of [r.coherent, r.whichPath, r.upper]) {
      expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    }
    for (let j = 1; j < r.grid.ny; j++) {
      expect(r.coherent[j]).toBeCloseTo(r.coherent[mirrorRow(j, r.grid.ny)], 10);
      expect(r.whichPath[j]).toBeCloseTo((r.upper[j] + r.upper[mirrorRow(j, r.grid.ny)]) / 2, 12);
    }
  });

  it('places bright fringes where the path difference is a whole number of wavelengths', () => {
    const peaks = findPeaks(interferenceFactor(r), 0.5).map(yAt);
    const predicted = predictedMaxima(cfg, 2);
    // Orders |m| ≤ 2 lie well inside the absorbing edge layers.
    for (const y of predicted) {
      const nearest = peaks.reduce((best, p) => (Math.abs(p - y) < Math.abs(best - y) ? p : best), Infinity);
      expect(Math.abs(nearest - y)).toBeLessThan(0.35);
    }
  });

  it('shows high-contrast interference without which-path information and loses it with', () => {
    const mid = r.grid.ny / 2;
    const w = Math.round(8 / r.grid.dy);
    expect(fringeVisibility(r.coherent, mid - w, mid + w)).toBeGreaterThan(0.9);
    expect(fringeVisibility(r.whichPath, mid - w, mid + w)).toBeLessThan(0.3);
  });

  it('agrees with a direct simulation of both slits open (validates ψ_both ≈ ψ₁ + ψ₂)', () => {
    const direct = runDirect(cfg, [true, true]);
    let l1 = 0;
    for (let j = 0; j < direct.length; j++) l1 += Math.abs(direct[j] - r.coherent[j]);
    expect(l1).toBeLessThan(0.05);
  }, 60_000);

  it('blocks almost everything at the mask and reports sensible timings', () => {
    // Two 0.8-wide slits in a ~4-wide beam: only a small fraction gets through each slit.
    expect(r.transmittedSingle).toBeGreaterThan(0.02);
    expect(r.transmittedSingle).toBeLessThan(0.15);
    expect(r.maskFraction).toBeGreaterThan(0);
    expect(r.arrivalFraction).toBeGreaterThan(r.maskFraction);
    expect(r.arrivalFraction).toBeLessThan(1);
  });

  it('mirrorRow maps y to −y on a centred grid', () => {
    const ny = r.grid.ny;
    for (let j = 1; j < ny; j++) {
      expect(yAt(mirrorRow(j, ny))).toBeCloseTo(-yAt(j), 10);
      expect(mirrorRow(mirrorRow(j, ny), ny)).toBe(j);
    }
  });
});
