import { describe, expect, it } from 'vitest';
import { BRANCH_COHERENT, BRANCH_LOWER, BRANCH_UPPER, DoubleSlitEngine, type EngineOptions } from './engine';

function options(overrides: Partial<EngineOptions> = {}): EngineOptions {
  // A toy 8-row screen: coherent pattern peaked at the centre, upper-slit pattern skewed up.
  const coherent = Float64Array.from([0, 0.05, 0.1, 0.35, 0.35, 0.1, 0.05, 0]);
  const upper = Float64Array.from([0, 0, 0.05, 0.1, 0.2, 0.3, 0.25, 0.1]);
  return {
    coherent,
    upper,
    y0: -4,
    dy: 1,
    halfWidth: 4,
    capacity: 50_000,
    cycle: 1,
    arrival: 0.5,
    atMask: 0.2,
    hitX: (y) => y,
    screenZ: -1,
    screenHeight: 2,
    histBins: 8,
    seed: 5,
    ...overrides,
  };
}

function rowCounts(e: DoubleSlitEngine, branch: number, n: number): number[] {
  const counts = new Array(8).fill(0);
  for (let i = 0; i < n; i++) counts[Math.floor(e.sampleY(branch) + 4 + 0.5)]++;
  return counts;
}

describe('DoubleSlitEngine', () => {
  it('samples detections from the Born-rule distribution', () => {
    const o = options();
    const e = new DoubleSlitEngine(o);
    const n = 100_000;
    const counts = rowCounts(e, BRANCH_COHERENT, n);
    let chi2 = 0;
    let dof = -1;
    o.coherent.forEach((p, j) => {
      if (p > 0) {
        chi2 += (counts[j] - p * n) ** 2 / (p * n);
        dof++;
      } else expect(counts[j]).toBe(0);
    });
    expect(dof).toBe(5);
    expect(chi2).toBeLessThan(20.5); // p = 0.001 for 5 dof
  });

  it('mirrors the upper-slit pattern for the lower branch', () => {
    const e = new DoubleSlitEngine(options());
    const up = rowCounts(e, BRANCH_UPPER, 40_000);
    const down = rowCounts(e, BRANCH_LOWER, 40_000);
    // Row j at y = j − 4 maps to −y, i.e. row 8 − j.
    for (let j = 1; j < 8; j++) expect(Math.abs(down[8 - j] - up[j])).toBeLessThan(1500);
  });

  it('emits at the requested rate and detects after the arrival delay', () => {
    const e = new DoubleSlitEngine(options());
    const dt = 1 / 60;
    let t = 0;
    for (let f = 0; f < 60; f++) e.update((t += dt), dt, 100, false, true);
    // After 1 s at 100/s with a 0.5 s delay: ≈ 50 detected.
    expect(e.detected).toBeGreaterThanOrEqual(45);
    expect(e.detected).toBeLessThanOrEqual(55);
    expect(e.hist.reduce((a, b) => a + b, 0)).toBe(e.detected);
  });

  it('keeps the newest hits in a bounded ring buffer', () => {
    const e = new DoubleSlitEngine(options({ capacity: 100 }));
    const dt = 1 / 60;
    let t = 0;
    for (let f = 0; f < 240; f++) e.update((t += dt), dt, 300, false, true);
    expect(e.detected).toBeGreaterThan(100);
    expect(e.stored).toBe(100);
    expect(e.writeIndex).toBe(e.detected % 100);
  });

  it('with which-path detectors, splits particles evenly between the slits', () => {
    const e = new DoubleSlitEngine(options());
    let upper = 0;
    let lower = 0;
    const dt = 1 / 60;
    let t = 0;
    for (let f = 0; f < 600; f++) {
      e.update((t += dt), dt, 200, true, true);
      if (e.flashUpper > 0.5) upper++;
      if (e.flashLower > 0.5) lower++;
    }
    expect(upper).toBeGreaterThan(300);
    expect(lower).toBeGreaterThan(300);
  });

  it('records the which-path branch of every hit', () => {
    const e = new DoubleSlitEngine(options());
    let t = 0;
    for (let f = 0; f < 120; f++) e.update((t += 1 / 60), 1 / 60, 200, true, true);
    const b = Array.from(e.branches.subarray(0, e.stored));
    expect(b.every((x) => x === BRANCH_UPPER || x === BRANCH_LOWER)).toBe(true);
    expect(b.filter((x) => x === BRANCH_UPPER).length).toBeGreaterThan(b.length * 0.35);
    e.clear();
    for (let f = 0; f < 120; f++) e.update((t += 1 / 60), 1 / 60, 200, false, true);
    expect(Array.from(e.branches.subarray(0, e.stored)).every((x) => x === BRANCH_COHERENT)).toBe(true);
  });

  it('clears everything', () => {
    const e = new DoubleSlitEngine(options());
    let t = 0;
    for (let f = 0; f < 60; f++) e.update((t += 1 / 60), 1 / 60, 100, false, true);
    e.clear();
    expect(e.detected).toBe(0);
    expect(e.stored).toBe(0);
    expect(Array.from(e.hist).every((v) => v === 0)).toBe(true);
  });
});
