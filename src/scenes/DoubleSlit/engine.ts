/**
 * Particle emission and detection for the double-slit scene. Pure TypeScript with
 * preallocated buffers: `update` runs every frame and allocates nothing.
 *
 * Every detection is an independent Born-rule sample from the simulated screen
 * distribution (alias method). With which-path detectors on, each particle first
 * registers at the upper or lower slit with probability ½ each (the mirror-symmetric
 * setup makes P(upper) = P(lower)), then lands according to that slit's pattern —
 * the conditional state after the detector record.
 */
import { AliasTable } from '../../physics/sampling';
import { mulberry32, type Rng } from '../../physics/rng';

export const BRANCH_COHERENT = 0;
export const BRANCH_UPPER = 1;
export const BRANCH_LOWER = 2;
export const MAX_PACKETS = 4;

export interface EngineOptions {
  coherent: Float64Array;
  upper: Float64Array;
  /** Screen row geometry of the distributions. */
  y0: number;
  dy: number;
  /** Only rows with |y| ≤ halfWidth hit the visible screen. */
  halfWidth: number;
  /** Maximum hits kept on screen (ring buffer). */
  capacity: number;
  /** Seconds for one full playback of a particle's wavefunction. */
  cycle: number;
  /** Fraction of the cycle at which the particle is registered on the screen. */
  arrival: number;
  /** Fraction of the cycle at which it passes the slits. */
  atMask: number;
  /** Map a simulation y to hit x (local), and pick the vertical position on the screen. */
  hitX(y: number): number;
  screenZ: number;
  screenHeight: number;
  histBins: number;
  /** How many particle wavefunctions may be drawn at once (≤ MAX_PACKETS). */
  visiblePackets?: number;
  seed?: number;
}

const PENDING = 1 << 14;

export class DoubleSlitEngine {
  readonly positions: Float32Array;
  readonly births: Float32Array;
  /** Per hit: 0 = no which-path record, 1 = upper slit, 2 = lower slit. */
  readonly branches: Float32Array;
  readonly hist: Float32Array;
  /** Hits currently stored (≤ capacity). */
  stored = 0;
  /** Total particles detected since the last clear. */
  detected = 0;
  /** Next write index in the ring buffer. */
  writeIndex = 0;
  /** Dirty span for GPU upload this frame: [dirtyStart, dirtyStart + dirtyCount) (may wrap). */
  dirtyStart = 0;
  dirtyCount = 0;
  histDirty = false;

  readonly packetStart = new Float64Array(MAX_PACKETS).fill(-1);
  readonly packetBranch = new Int8Array(MAX_PACKETS);
  flashUpper = 0;
  flashLower = 0;

  private readonly o: EngineOptions;
  private readonly rng: Rng;
  private readonly rowsVisible: Int32Array;
  private readonly coherentTable: AliasTable;
  private readonly upperTable: AliasTable;
  private readonly pendTime = new Float64Array(PENDING);
  private readonly pendY = new Float32Array(PENDING);
  private readonly pendBranch = new Int8Array(PENDING);
  private readonly flashTime = new Float64Array(PENDING);
  private readonly flashBranch = new Int8Array(PENDING);
  private pendHead = 0;
  private pendTail = 0;
  private flashHead = 0;
  private flashTail = 0;
  private emitAcc = 0;
  private lastVisual = -Infinity;

  constructor(o: EngineOptions) {
    this.o = o;
    this.rng = mulberry32(o.seed ?? 1927);
    this.positions = new Float32Array(o.capacity * 3);
    this.births = new Float32Array(o.capacity);
    this.branches = new Float32Array(o.capacity);
    this.hist = new Float32Array(o.histBins);
    const rows: number[] = [];
    for (let j = 0; j < o.coherent.length; j++) {
      if (Math.abs(o.y0 + j * o.dy) <= o.halfWidth) rows.push(j);
    }
    this.rowsVisible = Int32Array.from(rows);
    this.coherentTable = new AliasTable(rows.map((j) => o.coherent[j]));
    this.upperTable = new AliasTable(rows.map((j) => o.upper[j]));
  }

  clear(): void {
    this.stored = 0;
    this.detected = 0;
    this.writeIndex = 0;
    this.dirtyStart = 0;
    this.dirtyCount = 0;
    this.hist.fill(0);
    this.histDirty = true;
    this.pendHead = this.pendTail = 0;
    this.flashHead = this.flashTail = 0;
    this.packetStart.fill(-1);
    this.emitAcc = 0;
  }

  /** Sample a detection height y (simulation units) for a particle in the given branch. */
  sampleY(branch: number): number {
    const table = branch === BRANCH_COHERENT ? this.coherentTable : this.upperTable;
    const row = this.rowsVisible[table.sample(this.rng)];
    let y = this.o.y0 + (row + this.rng() - 0.5) * this.o.dy;
    if (branch === BRANCH_LOWER) y = -y; // ψ₂(y) = ψ₁(−y)
    return y;
  }

  private emit(now: number, measuring: boolean): void {
    const branch = measuring ? (this.rng() < 0.5 ? BRANCH_UPPER : BRANCH_LOWER) : BRANCH_COHERENT;
    const { cycle, arrival, atMask } = this.o;
    // Queue the detection; drop the oldest if the queue is saturated.
    if ((this.pendTail + 1) % PENDING === this.pendHead) this.pendHead = (this.pendHead + 1) % PENDING;
    this.pendTime[this.pendTail] = now + cycle * arrival;
    this.pendY[this.pendTail] = this.sampleY(branch);
    this.pendBranch[this.pendTail] = branch;
    this.pendTail = (this.pendTail + 1) % PENDING;
    if (measuring) {
      if ((this.flashTail + 1) % PENDING === this.flashHead) this.flashHead = (this.flashHead + 1) % PENDING;
      this.flashTime[this.flashTail] = now + cycle * atMask;
      this.flashBranch[this.flashTail] = branch;
      this.flashTail = (this.flashTail + 1) % PENDING;
    }
    // Show this particle's wavefunction if a display slot is free (packets spaced out so
    // that individual particles stay distinguishable at low rates).
    if (now - this.lastVisual >= cycle * 0.22) {
      const slots = Math.min(MAX_PACKETS, this.o.visiblePackets ?? MAX_PACKETS);
      for (let i = 0; i < slots; i++) {
        if (this.packetStart[i] < 0) {
          this.packetStart[i] = now;
          this.packetBranch[i] = branch;
          this.lastVisual = now;
          break;
        }
      }
    }
  }

  private detect(y: number, branch: number, now: number): void {
    const o = this.o;
    const i = this.writeIndex;
    this.positions[3 * i] = o.hitX(y);
    this.positions[3 * i + 1] = 0.1 + this.rng() * (o.screenHeight - 0.2);
    this.positions[3 * i + 2] = o.screenZ;
    this.births[i] = now;
    this.branches[i] = branch;
    if (this.dirtyCount === 0) this.dirtyStart = i;
    this.dirtyCount = Math.min(this.dirtyCount + 1, o.capacity);
    this.writeIndex = (i + 1) % o.capacity;
    this.stored = Math.min(this.stored + 1, o.capacity);
    this.detected++;
    const bin = Math.floor(((y + o.halfWidth) / (2 * o.halfWidth)) * o.histBins);
    if (bin >= 0 && bin < o.histBins) {
      this.hist[bin]++;
      this.histDirty = true;
    }
  }

  /**
   * Advance to time `now` (seconds). `emitting` false pauses the source while letting
   * in-flight particles finish.
   */
  update(now: number, dt: number, rate: number, measuring: boolean, emitting: boolean): void {
    this.dirtyCount = 0;
    if (emitting) {
      this.emitAcc += rate * Math.min(dt, 0.1);
      // Cap per-frame work so a long frame can't stall the next one.
      let budget = 400;
      while (this.emitAcc >= 1 && budget-- > 0) {
        this.emitAcc -= 1;
        this.emit(now, measuring);
      }
      if (budget <= 0) this.emitAcc = 0;
    }
    while (this.pendHead !== this.pendTail && this.pendTime[this.pendHead] <= now) {
      this.detect(this.pendY[this.pendHead], this.pendBranch[this.pendHead], now);
      this.pendHead = (this.pendHead + 1) % PENDING;
    }
    this.flashUpper *= Math.exp(-dt * 7);
    this.flashLower *= Math.exp(-dt * 7);
    while (this.flashHead !== this.flashTail && this.flashTime[this.flashHead] <= now) {
      if (this.flashBranch[this.flashHead] === BRANCH_UPPER)
        this.flashUpper = Math.min(1.5, this.flashUpper + 0.8);
      else this.flashLower = Math.min(1.5, this.flashLower + 0.8);
      this.flashHead = (this.flashHead + 1) % PENDING;
    }
    const life = this.o.cycle * this.o.arrival + FADE;
    for (let i = 0; i < MAX_PACKETS; i++) {
      if (this.packetStart[i] >= 0 && now - this.packetStart[i] > life) this.packetStart[i] = -1;
    }
  }

  /**
   * Display weight of packet i: full until detection, then a quick fade — the moment
   * the screen registers the particle at one spot.
   */
  packetWeight(i: number, now: number): number {
    const t0 = this.packetStart[i];
    if (t0 < 0) return 0;
    const age = now - t0;
    const tDet = this.o.cycle * this.o.arrival;
    const fadeIn = Math.min(1, age / 0.12);
    return age < tDet ? fadeIn : Math.max(0, 1 - (age - tDet) / FADE);
  }

  /** Playback position of packet i as a fraction of the simulated run. */
  packetTime(i: number, now: number): number {
    const t0 = this.packetStart[i];
    return t0 < 0 ? 0 : Math.min(1, (now - t0) / this.o.cycle);
  }
}

const FADE = 0.3;
