/**
 * A running Bell experiment: pairs are emitted at a chosen rate, fly to two separated
 * detectors whose settings are picked at random for every pair (as in real Bell tests),
 * and are tallied when they arrive. Each pair is measured twice in parallel — once as a
 * genuine entangled singlet (Born-rule sampling) and once by the local hidden-variable
 * model — so the two statistics can be compared on identical settings.
 * Preallocated ring buffers: `update` allocates nothing.
 */
import { CHSH_OPTIMAL, lhvOutcome, MERMIN_ANGLES, singletOutcome } from '../../physics/bell';
import { mulberry32, type Rng } from '../../physics/rng';

export type BellTest = 'mermin' | 'chsh';

export const SETTINGS: Record<BellTest, { alice: readonly number[]; bob: readonly number[] }> = {
  mermin: { alice: MERMIN_ANGLES, bob: MERMIN_ANGLES },
  chsh: { alice: CHSH_OPTIMAL.a, bob: CHSH_OPTIMAL.b },
};

const RING = 8192;
export const MAX_VISIBLE = 48;

export interface Tally {
  n: number;
  /** Σ A·B for the quantum pairs and the classical-model pairs. */
  sumQ: number;
  sumC: number;
}

export class BellEngine {
  readonly test: BellTest;
  /** Seconds for a particle to fly from the source to a detector. */
  readonly flight: number;
  /** tallies[i * nb + j] for Alice setting i, Bob setting j. */
  readonly tallies: Tally[];
  total = 0;
  agreeQ = 0;
  agreeC = 0;
  /** Alice's +1 count for the quantum pairs, split by Bob's setting (no-signalling check). */
  readonly alicePlusByBob: Float64Array;
  readonly countByBob: Float64Array;
  /** Most recent arrival for the detector displays. */
  last = { at: -1, ia: 0, ib: 0, A: 1, B: -1 };
  /** Launch times of the pairs currently drawn in flight (−1 = free slot). */
  readonly visible = new Float64Array(MAX_VISIBLE).fill(-1);

  private readonly rng: Rng;
  private readonly t0 = new Float64Array(RING);
  private readonly ia = new Int8Array(RING);
  private readonly ib = new Int8Array(RING);
  private readonly qa = new Int8Array(RING);
  private readonly qb = new Int8Array(RING);
  private readonly ca = new Int8Array(RING);
  private readonly cb = new Int8Array(RING);
  private head = 0;
  private tail = 0;
  private acc = 0;
  private lastVisual = -Infinity;

  constructor(test: BellTest, flight: number, seed: number) {
    this.test = test;
    this.flight = flight;
    this.rng = mulberry32(seed);
    const s = SETTINGS[test];
    this.tallies = Array.from({ length: s.alice.length * s.bob.length }, () => ({ n: 0, sumQ: 0, sumC: 0 }));
    this.alicePlusByBob = new Float64Array(s.bob.length);
    this.countByBob = new Float64Array(s.bob.length);
  }

  clear(): void {
    for (const t of this.tallies) t.n = t.sumQ = t.sumC = 0;
    this.total = this.agreeQ = this.agreeC = 0;
    this.alicePlusByBob.fill(0);
    this.countByBob.fill(0);
    this.head = this.tail = 0;
    this.visible.fill(-1);
  }

  private emit(now: number): void {
    const s = SETTINGS[this.test];
    const i = Math.floor(this.rng() * s.alice.length);
    const j = Math.floor(this.rng() * s.bob.length);
    const [A, B] = singletOutcome(s.alice[i], s.bob[j], this.rng);
    const [A2, B2] = lhvOutcome(s.alice[i], s.bob[j], this.rng);
    if ((this.tail + 1) % RING === this.head) this.head = (this.head + 1) % RING; // drop oldest
    const k = this.tail;
    this.t0[k] = now;
    this.ia[k] = i;
    this.ib[k] = j;
    this.qa[k] = A;
    this.qb[k] = B;
    this.ca[k] = A2;
    this.cb[k] = B2;
    this.tail = (k + 1) % RING;
    if (now - this.lastVisual > 0.12) {
      for (let v = 0; v < MAX_VISIBLE; v++) {
        if (this.visible[v] < 0) {
          this.visible[v] = now;
          this.lastVisual = now;
          break;
        }
      }
    }
  }

  private arrive(k: number, now: number): void {
    const nb = SETTINGS[this.test].bob.length;
    const t = this.tallies[this.ia[k] * nb + this.ib[k]];
    t.n++;
    t.sumQ += this.qa[k] * this.qb[k];
    t.sumC += this.ca[k] * this.cb[k];
    this.total++;
    // Mermin "agreement": opposite spins (the perfectly correlated outcome at equal settings).
    if (this.qa[k] === -this.qb[k]) this.agreeQ++;
    if (this.ca[k] === -this.cb[k]) this.agreeC++;
    this.countByBob[this.ib[k]]++;
    if (this.qa[k] === 1) this.alicePlusByBob[this.ib[k]]++;
    const l = this.last;
    l.at = now;
    l.ia = this.ia[k];
    l.ib = this.ib[k];
    l.A = this.qa[k];
    l.B = this.qb[k];
  }

  update(now: number, dt: number, rate: number, emitting: boolean): void {
    // Arrivals first, so a full ring never drops pairs that are about to be detected.
    while (this.head !== this.tail && now - this.t0[this.head] >= this.flight) {
      this.arrive(this.head, now);
      this.head = (this.head + 1) % RING;
    }
    if (emitting) {
      this.acc += rate * Math.min(dt, 0.1);
      let budget = 200;
      while (this.acc >= 1 && budget-- > 0) {
        this.acc -= 1;
        this.emit(now);
      }
      if (budget <= 0) this.acc = 0;
    }
    for (let v = 0; v < MAX_VISIBLE; v++) {
      if (this.visible[v] >= 0 && now - this.visible[v] > this.flight) this.visible[v] = -1;
    }
  }

  /** Measured correlation E_ij = ⟨AB⟩ and its standard error. */
  correlation(i: number, j: number, which: 'q' | 'c'): { e: number; se: number; n: number } {
    const t = this.tallies[i * SETTINGS[this.test].bob.length + j];
    if (t.n === 0) return { e: 0, se: Infinity, n: 0 };
    const e = (which === 'q' ? t.sumQ : t.sumC) / t.n;
    return { e, se: Math.sqrt(Math.max(1 - e * e, 1e-6) / t.n), n: t.n };
  }
}
