import { create } from 'zustand';

export const MANY = 100;

export interface PairSummary {
  pairs: number;
  matched: number;
  leftZero: number;
  last: { left: 0 | 1; right: 0 | 1 } | null;
}

interface EntanglementState {
  /** Latest request from the controls; the scene launches `n` pairs when `token` changes. */
  request: { n: number; token: number };
  /** Pairs launched but not yet measured. */
  inFlight: number;
  summary: PairSummary;
  measurePair(): void;
  measureMany(): void;
  reset(): void;
}

const EMPTY: PairSummary = { pairs: 0, matched: 0, leftZero: 0, last: null };

export const useEntanglement = create<EntanglementState>()((set) => ({
  request: { n: 0, token: 0 },
  inFlight: 0,
  summary: EMPTY,
  measurePair: () => set((s) => ({ request: { n: 1, token: s.request.token + 1 } })),
  measureMany: () => set((s) => ({ request: { n: MANY, token: s.request.token + 1 } })),
  reset: () => set((s) => ({ request: { n: 0, token: s.request.token + 1 }, inFlight: 0, summary: EMPTY })),
}));
