import { create } from 'zustand';

export const EXPERIMENTS = ['basics', 'superposition', 'qubits', 'entanglement', 'search'] as const;
export type ExperimentId = (typeof EXPERIMENTS)[number];

export const isExperiment = (s: string): s is ExperimentId => (EXPERIMENTS as readonly string[]).includes(s);

interface LabState {
  /** The experiment being viewed, or null for the lab overview. */
  current: ExperimentId | null;
  /** Experiments opened at least once, in the order they were first opened. */
  visited: ExperimentId[];
  /** Table under the pointer in the 3D room (drives its glow). */
  hovered: ExperimentId | null;
  /** True while the card about the quantum computer (the gold machine) is open. */
  computer: boolean;
  open(id: ExperimentId | null): void;
  showComputer(): void;
  step(dir: 1 | -1): void;
  setHovered(id: ExperimentId | null): void;
}

export const useLab = create<LabState>()((set, get) => ({
  current: null,
  visited: [],
  hovered: null,
  computer: false,
  open: (current) => {
    const { visited } = get();
    set({
      current,
      computer: false,
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
  showComputer: () => set({ current: null, computer: true, hovered: null }),
}));

/** The view named in the URL hash: an experiment id, `computer`, or '' for the lab. */
const viewOf = (s: Pick<LabState, 'current' | 'computer'>) => s.current ?? (s.computer ? 'computer' : '');

/**
 * Keeps the URL hash in step with the open experiment (or `#computer`), so the browser's Back
 * button returns to the lab and links like `#qubits` open an experiment directly.
 */
export function initLabHistory(): () => void {
  const hash = () => location.hash.slice(1);
  const apply = (view: string) => {
    const lab = useLab.getState();
    if (view === viewOf(lab)) return;
    if (view === 'computer') lab.showComputer();
    else lab.open(isExperiment(view) ? view : null);
  };
  apply(hash());

  const onPop = () => apply(hash());
  window.addEventListener('popstate', onPop);
  const unsub = useLab.subscribe((s, prev) => {
    const view = viewOf(s);
    if (view === viewOf(prev) || view === hash()) return;
    history.pushState(null, '', view ? `#${view}` : location.pathname + location.search);
  });
  return () => {
    window.removeEventListener('popstate', onPop);
    unsub();
  };
}
