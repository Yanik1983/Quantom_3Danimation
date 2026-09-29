import { create } from 'zustand';
import { bitsToIndex, measureAll } from '../../physics/qubits';
import { liveRng } from '../../lib/random';

export const MAX_QUBITS = 4;
/** "Measure 100 times": each time a freshly prepared register. */
export const MANY = 100;

interface QubitsState {
  /** Every qubit is prepared in the same mix, with P(1) = p1. */
  p1: number;
  count: number;
  /** Bits found by the last single measurement (qubit 0 first). */
  result: number[] | null;
  measureToken: number;
  /** Results of the last "measure 100 times", as bit-string indices (qubit 0 most significant). */
  batch: Uint8Array | null;
  batchToken: number;
  setP1(p: number): void;
  setCount(n: number): void;
  measure(): void;
  measureMany(): void;
  reset(): void;
}

export const useQubits = create<QubitsState>()((set, get) => ({
  p1: 0.5,
  count: 1,
  result: null,
  measureToken: 0,
  batch: null,
  batchToken: 0,
  setP1: (p1) => set({ p1, result: null, batch: null }),
  setCount: (count) => set({ count, result: null, batch: null }),
  measure: () =>
    set((s) => ({
      result: measureAll(s.count, s.p1, liveRng),
      measureToken: s.measureToken + 1,
      batch: null,
    })),
  measureMany: () => {
    const { count, p1 } = get();
    const batch = new Uint8Array(MANY);
    for (let i = 0; i < MANY; i++) batch[i] = bitsToIndex(measureAll(count, p1, liveRng));
    set((s) => ({ batch, batchToken: s.batchToken + 1, result: null }));
  },
  reset: () => set({ p1: 0.5, count: 1, result: null, batch: null }),
}));

/** How often each bit string came up in a batch (length 2ⁿ). */
export function countResults(batch: Uint8Array, count: number): number[] {
  const out = new Array<number>(1 << count).fill(0);
  for (const r of batch) out[r]++;
  return out;
}
