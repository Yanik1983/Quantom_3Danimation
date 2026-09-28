import { create } from 'zustand';
import type { BellTest } from './engine';

export interface BellSummary {
  total: number;
  agreeQ: number;
  agreeC: number;
  /** Measured correlations per setting pair: [i][j] → {e, se, n} for quantum and model. */
  cells: { i: number; j: number; delta: number; q: number; qse: number; c: number; cse: number; n: number }[];
  alicePlusByBob: number[];
}

interface EntanglementState {
  test: BellTest;
  /** Entangled pairs per second. */
  rate: number;
  /** Bumped to clear the counters. */
  clearToken: number;
  summary: BellSummary | null;
  setTest(t: BellTest): void;
  setRate(r: number): void;
  clear(): void;
  reset(): void;
}

const DEFAULTS = { test: 'mermin' as BellTest, rate: 8 };

export const useEntanglement = create<EntanglementState>()((set) => ({
  ...DEFAULTS,
  clearToken: 0,
  summary: null,
  setTest: (test) => set((s) => ({ test, clearToken: s.clearToken + 1, summary: null })),
  setRate: (rate) => set({ rate }),
  clear: () => set((s) => ({ clearToken: s.clearToken + 1, summary: null })),
  reset: () => set((s) => ({ ...DEFAULTS, clearToken: s.clearToken + 1, summary: null })),
}));
