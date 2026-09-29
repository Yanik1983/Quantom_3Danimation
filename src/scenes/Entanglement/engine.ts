/**
 * Entangled pairs in flight. Pure TypeScript with preallocated slots; `update` allocates
 * nothing per frame (an outcome tuple only when a pair is measured).
 *
 * Each pair is two qubits created in the Bell state (|00⟩ + |11⟩)/√2 and flown to two
 * detectors that measure along the same axis. The joint outcome is Born-sampled at the moment
 * of detection (physics/bell.ts, phiPlusOutcome with a = b): each side on its own is a fair
 * coin, and the two sides always match.
 */
import { phiPlusOutcome } from '../../physics/bell';
import type { Rng } from '../../physics/rng';

export const SLOTS = 48;
/** Flight time for a single pair, and for pairs in a batch of many. */
export const FLIGHT_SLOW = 1.3;
export const FLIGHT_FAST = 0.7;
/** Seconds between pairs in a batch. */
export const BATCH_SPACING = 0.05;

export interface PairResult {
  left: 0 | 1;
  right: 0 | 1;
  /** Time of detection. */
  at: number;
}

export class PairEngine {
  /** Launch time of the pair in each slot (−1 = empty) and its flight time. */
  readonly start = new Float64Array(SLOTS).fill(-1);
  readonly flight = new Float64Array(SLOTS);
  pending = 0;
  fast = false;
  last: PairResult = { left: 0, right: 0, at: -1 };
  pairs = 0;
  matched = 0;
  leftZero = 0;
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
    this.pairs = this.matched = this.leftZero = 0;
    this.last = { left: 0, right: 0, at: -1 };
  }

  /** Advance to `now` (s). Returns how many pairs were measured during this step. */
  update(now: number): number {
    let measured = 0;
    for (let i = 0; i < SLOTS; i++) {
      const t0 = this.start[i];
      if (t0 < 0 || now - t0 < this.flight[i]) continue;
      const [left, right] = phiPlusOutcome(0, 0, this.rng);
      this.last = { left, right, at: now };
      this.pairs++;
      if (left === right) this.matched++;
      if (left === 0) this.leftZero++;
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
