import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../physics/rng';
import { BATCH_SPACING, FLIGHT_FAST, FLIGHT_SLOW, PairEngine } from './engine';

function run(e: PairEngine, seconds: number, dt = 1 / 60) {
  let t = 0;
  let measured = 0;
  for (let i = 0; i <= seconds / dt; i++, t += dt) measured += e.update(t);
  return measured;
}

describe('entangled pair engine', () => {
  it('measures one pair after its flight', () => {
    const e = new PairEngine(mulberry32(1));
    e.request(1, 0);
    expect(e.update(0)).toBe(0);
    expect(e.update(FLIGHT_SLOW - 0.01)).toBe(0);
    expect(e.update(FLIGHT_SLOW + 0.01)).toBe(1);
    expect(e.pairs).toBe(1);
  });

  it('always gives matching results, each side a fair coin', () => {
    const e = new PairEngine(mulberry32(42));
    const n = 4000;
    e.request(n, 0);
    const measured = run(e, n * BATCH_SPACING + FLIGHT_FAST + 1);
    expect(measured).toBe(n);
    expect(e.pairs).toBe(n);
    expect(e.matched).toBe(n);
    const sigma = Math.sqrt(0.25 / n);
    expect(Math.abs(e.leftZero / n - 0.5)).toBeLessThan(4 * sigma);
  });

  it('a batch of 100 finishes within a few seconds', () => {
    const e = new PairEngine(mulberry32(3));
    e.request(100, 0);
    run(e, 100 * BATCH_SPACING + FLIGHT_FAST + 0.2);
    expect(e.pairs).toBe(100);
    expect(e.pending).toBe(0);
  });

  it('clear forgets pairs and counts', () => {
    const e = new PairEngine(mulberry32(3));
    e.request(5, 0);
    run(e, 2);
    e.clear();
    expect(e.pairs).toBe(0);
    expect(e.update(10)).toBe(0);
  });
});
