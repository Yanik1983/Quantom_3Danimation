import { create } from 'zustand';
import { measureAll } from '../../physics/qubits';
import { liveRng } from '../../lib/random';

export const MAX_QUBITS = 4;

interface QubitsState {
  /** Every qubit is prepared in the same mix, with P(1) = p1. */
  p1: number;
  count: number;
  /** Bits found by the last measurement (qubit 0 first). */
  result: number[] | null;
  measureToken: number;
  setP1(p: number): void;
  setCount(n: number): void;
  measure(): void;
  reset(): void;
}

export const useQubits = create<QubitsState>()((set) => ({
  p1: 0.5,
  count: 1,
  result: null,
  measureToken: 0,
  setP1: (p1) => set({ p1, result: null }),
  setCount: (count) => set({ count, result: null }),
  measure: () =>
    set((s) => ({ result: measureAll(s.count, s.p1, liveRng), measureToken: s.measureToken + 1 })),
  reset: () => set({ p1: 0.5, count: 1, result: null }),
}));
