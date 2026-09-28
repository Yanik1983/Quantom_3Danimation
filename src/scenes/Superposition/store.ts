import { create } from 'zustand';
import { measure } from '../../physics/bloch';
import { thetaForP1 } from '../../physics/qubits';
import { liveRng } from '../../lib/random';

export type Box = 'left' | 'right';
export const LOOKS = 100;

/**
 * A particle in a|left⟩ + b|right⟩ is a two-state system: |left⟩ ≡ |0⟩, |right⟩ ≡ |1⟩,
 * so looking is a projective measurement in that basis with P(right) = |b|².
 */
function lookOnce(pRight: number): Box {
  return measure({ theta: thetaForP1(pRight), phi: 0 }, 'z', liveRng).plus ? 'left' : 'right';
}

interface SuperpositionState {
  /** Odds of finding the particle in the right box, |b|². */
  pRight: number;
  /** Where the last single look found the particle. */
  found: Box | null;
  /** Bumped on every single look (drives the collapse animation). */
  lookToken: number;
  /** Results of the last "look 100 times": each time a freshly prepared particle. */
  tally: { left: number; right: number } | null;
  tallyToken: number;
  setPRight(p: number): void;
  look(): void;
  lookMany(): void;
  reset(): void;
}

export const useSuperposition = create<SuperpositionState>()((set, get) => ({
  pRight: 0.5,
  found: null,
  lookToken: 0,
  tally: null,
  tallyToken: 0,
  setPRight: (pRight) => set({ pRight, found: null, tally: null }),
  look: () => set((s) => ({ found: lookOnce(s.pRight), lookToken: s.lookToken + 1, tally: null })),
  lookMany: () => {
    const p = get().pRight;
    let right = 0;
    for (let i = 0; i < LOOKS; i++) if (lookOnce(p) === 'right') right++;
    set((s) => ({ tally: { left: LOOKS - right, right }, tallyToken: s.tallyToken + 1, found: null }));
  },
  reset: () => set({ pRight: 0.5, found: null, tally: null }),
}));
