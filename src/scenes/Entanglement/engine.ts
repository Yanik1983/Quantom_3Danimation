/**
 * Entangled pairs in flight. Pure TypeScript with preallocated slots; `update` allocates
 * nothing per frame (an outcome tuple only when a pair is measured).
 *
 * Each pair is created in the singlet state (|↑↓⟩ − |↓↑⟩)/√2 and flies to two detectors
 * that measure spin along the same (vertical) axis. The joint outcome is Born-sampled at
 * the moment of detection (physics/bell.ts, singletOutcome with a = b): each side on its own
 * is a fair coin, and the two sides are always opposite.
 */
import { singletOutcome } from '../../physics/bell';
import type { Rng } from '../../physics/rng';

export const SLOTS = 48;
/** Flight time for a single pair, and for pairs in a batch of many. */
export const FLIGHT_SLOW = 1.3;
export const FLIGHT_FAST = 0.7;
/** Seconds between pairs in a batch. */
export const BATCH_SPACING = 0.05;

export interface PairResult {
  left: 1 | -1;
  right: 1 | -1;
  /** Time of detection. */
  at: number;
}

export class PairEngine {
  /** Launch time of the pair in each slot (−1 = empty) and its flight time. */
  readonly start = new Float64Array(SLOTS).fill(-1);
  readonly flight = new Float64Array(SLOTS);
  pending = 0;
  fast = false;
  last: PairResult = { left: 1, right: -1, at: -1 };
  pairs = 0;
  opposite = 0;
  leftUp = 0;
  /** Scheduled time of the next launch (keeps batch spacing exact at any frame rate). */
  private nextLaunch = 0;
  private readonly rng: Rng;

  constructor(rng: Rng) {
    this.rng = rng;
  }

  /** Queue n pairs; many at once fly faster and closer together. */
  request(n: number, now: number): void {
    if (this.pending === 0) this.nextLaunch = now;
    this.pending += n;
    this.fast = n > 1;
  }

  clear(): void {
    this.start.fill(-1);
    this.pending = 0;
    this.pairs = this.opposite = this.leftUp = 0;
    this.last = { left: 1, right: -1, at: -1 };
  }

  /** Advance to `now` (s). Returns how many pairs were measured during this step. */
  update(now: number): number {
    let measured = 0;
    for (let i = 0; i < SLOTS; i++) {
      const t0 = this.start[i];
      if (t0 < 0 || now - t0 < this.flight[i]) continue;
      const [A, B] = singletOutcome(0, 0, this.rng);
      const left = A > 0 ? 1 : -1;
      const right = B > 0 ? 1 : -1;
      this.last = { left, right, at: now };
      this.pairs++;
      if (left !== right) this.opposite++;
      if (left > 0) this.leftUp++;
      this.start[i] = -1;
      measured++;
    }
    while (this.pending > 0 && now >= this.nextLaunch) {
      const slot = this.start.indexOf(-1);
      if (slot < 0) break;
      this.start[slot] = this.nextLaunch;
      this.flight[slot] = this.fast ? FLIGHT_FAST : FLIGHT_SLOW;
      this.nextLaunch += this.fast ? BATCH_SPACING : 0;
      this.pending--;
    }
    return measured;
  }

  /** Flight progress 0…1 of the pair in a slot (negative if the slot is empty). */
  progress(slot: number, now: number): number {
    const t0 = this.start[slot];
    return t0 < 0 ? -1 : Math.min(1, (now - t0) / this.flight[slot]);
  }
}
