import { create } from 'zustand';
import { eigenstate, measure, probabilityPlus, type Basis, type Qubit } from '../../physics/bloch';
import { mulberry32 } from '../../physics/rng';

/** Measurement outcomes must be unpredictable: seed from the browser's entropy source. */
const rng = mulberry32(crypto.getRandomValues(new Uint32Array(1))[0]);

/** θ = 60°, φ = 110°: P(|0⟩) = 75 %, pointing clearly to the side in the default view. */
export const DEFAULT_STATE: Qubit = { theta: Math.PI / 3, phi: (110 * Math.PI) / 180 };

interface SuperpositionState {
  /** The prepared state. */
  prepared: Qubit;
  basis: Basis;
  /** Outcome of the last single measurement; the displayed state is its eigenstate. */
  collapsed: { plus: boolean; basis: Basis } | null;
  /** Outcomes for fresh copies of the prepared state in the current basis. */
  tally: { plus: number; minus: number };
  /** Bumped on each single measurement (drives the interaction flash). */
  measureToken: number;
  setPrepared(q: Qubit): void;
  setBasis(b: Basis): void;
  measureOnce(): void;
  measureMany(n: number): void;
  prepareAgain(): void;
  reset(): void;
}

export const displayedState = (s: SuperpositionState): Qubit =>
  s.collapsed ? eigenstate(s.collapsed.basis, s.collapsed.plus) : s.prepared;

export const useSuperposition = create<SuperpositionState>()((set, get) => ({
  prepared: { ...DEFAULT_STATE },
  basis: 'z',
  collapsed: null,
  tally: { plus: 0, minus: 0 },
  measureToken: 0,
  setPrepared: (prepared) => set({ prepared, collapsed: null, tally: { plus: 0, minus: 0 } }),
  setBasis: (basis) => set({ basis, collapsed: null, tally: { plus: 0, minus: 0 } }),
  measureOnce: () => {
    const s = get();
    // Measuring an already-collapsed qubit measures the post-measurement state.
    const r = measure(displayedState(s), s.basis, rng);
    const fresh = !s.collapsed;
    set({
      collapsed: { plus: r.plus, basis: s.basis },
      measureToken: s.measureToken + 1,
      tally: fresh
        ? { plus: s.tally.plus + (r.plus ? 1 : 0), minus: s.tally.minus + (r.plus ? 0 : 1) }
        : s.tally,
    });
  },
  measureMany: (n) => {
    const s = get();
    const p = probabilityPlus(s.prepared, s.basis);
    let plus = 0;
    for (let i = 0; i < n; i++) if (rng() < p) plus++;
    set({ tally: { plus: s.tally.plus + plus, minus: s.tally.minus + n - plus }, collapsed: null });
  },
  prepareAgain: () => set({ collapsed: null }),
  reset: () =>
    set((s) => ({
      prepared: { ...DEFAULT_STATE },
      basis: 'z',
      collapsed: null,
      tally: { plus: 0, minus: 0 },
      measureToken: s.measureToken,
    })),
}));
