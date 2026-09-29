import { create } from 'zustand';
import { diffuse, measureIndex, oracle, setUniform } from '../../physics/grover';
import { liveRng } from '../../lib/random';

/** Two qubits: four cups, labelled by the bit strings 00, 01, 10, 11. */
export const QUBITS = 2;
export const CUPS = 1 << QUBITS;
export const CUP_LABELS = ['00', '01', '10', '11'] as const;

/**
 * Where the search is: 0 ready (|00⟩), 1 spread out (even mix), 2 marked (oracle applied),
 * 3 interfered (diffusion applied), 4 measured.
 */
export type Stage = 0 | 1 | 2 | 3 | 4;

/** Amplitudes of the four cups at a stage (the state before any measurement). */
export function amplitudesAt(stage: Stage, marked: number, out: Float64Array): Float64Array {
  if (stage === 0) {
    out.fill(0);
    out[0] = 1;
    return out;
  }
  setUniform(out);
  if (stage >= 2) oracle(out, marked);
  if (stage >= 3) diffuse(out);
  return out;
}

interface SearchState {
  /** The cup hiding the card (known only to the oracle). */
  marked: number;
  stage: Stage;
  /** Amplitudes of |00⟩ … |11⟩. */
  amps: Float64Array;
  /** The cup the measurement found. */
  found: number | null;
  next(): void;
  hideNew(): void;
  reset(): void;
}

const pickCup = () => Math.floor(liveRng() * CUPS);

export const useSearch = create<SearchState>()((set, get) => ({
  marked: pickCup(),
  stage: 0,
  amps: amplitudesAt(0, 0, new Float64Array(CUPS)),
  found: null,
  next: () => {
    const { stage, marked, amps } = get();
    if (stage === 4) return;
    const nextStage = (stage + 1) as Stage;
    if (nextStage === 4) {
      set({ stage: 4, found: measureIndex(amps, liveRng) });
      return;
    }
    set({ stage: nextStage, amps: amplitudesAt(nextStage, marked, new Float64Array(CUPS)) });
  },
  hideNew: () =>
    set({ marked: pickCup(), stage: 0, amps: amplitudesAt(0, 0, new Float64Array(CUPS)), found: null }),
  reset: () => get().hideNew(),
}));
