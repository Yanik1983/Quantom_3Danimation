import { create } from 'zustand';

export const EXPERIMENTS = ['basics', 'superposition', 'qubits', 'entanglement'] as const;
export type ExperimentId = (typeof EXPERIMENTS)[number];

export const isExperiment = (s: string): s is ExperimentId => (EXPERIMENTS as readonly string[]).includes(s);

interface LabState {
  /** The experiment being viewed, or null for the lab overview. */
  current: ExperimentId | null;
  /** Experiments opened at least once, in the order they were first opened. */
  visited: ExperimentId[];
  /** Table under the pointer in the 3D room (drives its glow). */
  hovered: ExperimentId | null;
  open(id: ExperimentId | null): void;
  step(dir: 1 | -1): void;
  setHovered(id: ExperimentId | null): void;
}

export const useLab = create<LabState>()((set, get) => ({
  current: null,
  visited: [],
  hovered: null,
  open: (current) => {
    const { visited } = get();
    set({
      current,
      hovered: null,
      visited: current && !visited.includes(current) ? [...visited, current] : visited,
    });
  },
  step: (dir) => {
    const { current, open } = get();
    const i = current ? EXPERIMENTS.indexOf(current) + dir : 0;
    open(i >= 0 && i < EXPERIMENTS.length ? EXPERIMENTS[i] : null);
  },
  setHovered: (hovered) => set({ hovered }),
}));

/**
 * Keeps the URL hash in step with the open experiment, so the browser's Back button returns
 * to the lab and links like `#qubits` open an experiment directly.
 */
export function initLabHistory(): () => void {
  const fromHash = () => {
    const id = location.hash.slice(1);
    return isExperiment(id) ? id : null;
  };
  const initial = fromHash();
  if (initial) useLab.getState().open(initial);

  const onPop = () => {
    const id = fromHash();
    if (id !== useLab.getState().current) useLab.getState().open(id);
  };
  window.addEventListener('popstate', onPop);
  const unsub = useLab.subscribe((s, prev) => {
    if (s.current === prev.current || s.current === fromHash()) return;
    const url = s.current ? `#${s.current}` : location.pathname + location.search;
    history.pushState(null, '', url);
  });
  return () => {
    window.removeEventListener('popstate', onPop);
    unsub();
  };
}
