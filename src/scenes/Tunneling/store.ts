import { create } from 'zustand';

interface TunnelingState {
  /** Mean packet energy E = k₀²/2. */
  energy: number;
  V0: number;
  a: number;
  autoRepeat: boolean;
  /** Bumped to restart the packet. */
  runToken: number;
  /** Live readouts from the running simulation. */
  T: number;
  R: number;
  done: boolean;
  setEnergy(e: number): void;
  setV0(v: number): void;
  setA(a: number): void;
  setAutoRepeat(v: boolean): void;
  fire(): void;
  reset(): void;
}

const DEFAULTS = { energy: 0.8, V0: 1.2, a: 1.0, autoRepeat: true };

export const useTunneling = create<TunnelingState>()((set) => ({
  ...DEFAULTS,
  runToken: 0,
  T: 0,
  R: 0,
  done: false,
  setEnergy: (energy) => set((s) => ({ energy, runToken: s.runToken + 1 })),
  setV0: (V0) => set((s) => ({ V0, runToken: s.runToken + 1 })),
  setA: (a) => set((s) => ({ a, runToken: s.runToken + 1 })),
  setAutoRepeat: (autoRepeat) => set({ autoRepeat }),
  fire: () => set((s) => ({ runToken: s.runToken + 1 })),
  reset: () => set((s) => ({ ...DEFAULTS, runToken: s.runToken + 1 })),
}));
