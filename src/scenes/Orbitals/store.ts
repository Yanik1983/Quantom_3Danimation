import { create } from 'zustand';

interface OrbitalsState {
  n: number;
  l: number;
  m: number;
  /** Cutaway plane position as a fraction of the cloud radius; 1 = no cut. */
  cut: number;
  autoRotate: boolean;
  /** Radius (a₀) enclosing 95 % probability, reported by the sampler. */
  r95: number | null;
  setN(n: number): void;
  setL(l: number): void;
  setM(m: number): void;
  setCut(c: number): void;
  setAutoRotate(v: boolean): void;
  reset(): void;
}

const DEFAULTS = { n: 3, l: 2, m: 0, cut: 1, autoRotate: true };

export const useOrbitals = create<OrbitalsState>()((set) => ({
  ...DEFAULTS,
  r95: null,
  // Keep quantum numbers valid: 0 ≤ l < n, |m| ≤ l.
  setN: (n) =>
    set((s) => ({
      n,
      l: Math.min(s.l, n - 1),
      m: Math.max(-Math.min(s.l, n - 1), Math.min(s.m, Math.min(s.l, n - 1))),
    })),
  setL: (l) => set((s) => ({ l, m: Math.max(-l, Math.min(s.m, l)) })),
  setM: (m) => set({ m }),
  setCut: (cut) => set({ cut }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  reset: () => set({ ...DEFAULTS }),
}));
