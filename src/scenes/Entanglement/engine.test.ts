import { describe, expect, it } from 'vitest';
import { chsh } from '../../physics/bell';
import { BellEngine } from './engine';

function run(test: 'mermin' | 'chsh', seconds: number, rate = 2000) {
  const e = new BellEngine(test, 0.5, 42);
  const dt = 1 / 60;
  for (let t = dt; t < seconds; t += dt) e.update(t, dt, rate, true);
  return e;
}

describe('BellEngine', () => {
  it('Mermin: quantum agreement ≈ 1/2, below the classical minimum 5/9 that the model respects', () => {
    const e = run('mermin', 30);
    expect(e.total).toBeGreaterThan(50_000);
    expect(e.agreeQ / e.total).toBeCloseTo(0.5, 2);
    expect(e.agreeC / e.total).toBeCloseTo(5 / 9, 2);
  });

  it('CHSH: quantum |S| ≈ 2√2 while the hidden-variable model stays at 2', () => {
    const e = run('chsh', 30);
    const Sq = chsh((i, j) => e.correlation(i, j, 'q').e);
    const Sc = chsh((i, j) => e.correlation(i, j, 'c').e);
    expect(Math.abs(Sq)).toBeCloseTo(2 * Math.SQRT2, 1);
    expect(Math.abs(Sc)).toBeCloseTo(2, 1);
  });

  it('delays detection by the flight time and chooses settings uniformly', () => {
    const e = new BellEngine('mermin', 1, 1);
    e.update(0.5, 0.5, 20, true);
    expect(e.total).toBe(0);
    for (let t = 0.6; t < 20; t += 0.1) e.update(t, 0.1, 300, true);
    for (const t of e.tallies) expect(t.n / e.total).toBeCloseTo(1 / 9, 1);
    e.clear();
    expect(e.total).toBe(0);
  });
});
