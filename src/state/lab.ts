import { create } from 'zustand';

export const EXPERIMENTS = ['basics', 'qubits', 'entanglement', 'search'] as const;
export type ExperimentId = (typeof EXPERIMENTS)[number];

/** Full-screen cards outside the experiments: the real machine, and the ending after step 4. */
export type Panel = 'computer' | 'finale';
const isPanel = (s: string): s is Panel => s === 'computer' || s === 'finale';

export const isExperiment = (s: string): s is ExperimentId => (EXPERIMENTS as readonly string[]).includes(s);

interface LabState {
  /** The experiment being viewed, or null for the lab overview. */
  current: ExperimentId | null;
  /** Experiments opened at least once, in the order they were first opened. */
  visited: ExperimentId[];
  /** Table under the pointer in the 3D room (drives its glow). */
  hovered: ExperimentId | null;
  /** The card about the real quantum computer (the gold machine) or the finale, if open. */
  panel: Panel | null;
  open(id: ExperimentId | null): void;
  show(panel: Panel): void;
  step(dir: 1 | -1): void;
  setHovered(id: ExperimentId | null): void;
}

export const useLab = create<LabState>()((set, get) => ({
  current: null,
  visited: [],
  hovered: null,
  panel: null,
  open: (current) => {
    const { visited } = get();
    set({
      current,
      panel: null,
      hovered: null,
      visited: current && !visited.includes(current) ? [...visited, current] : visited,
    });
  },
  step: (dir) => {
    const { current, open } = get();
    const i = current ? EXPERIMENTS.indexOf(current) + dir : 0;
    // Past the last step comes the finale.
    if (i === EXPERIMENTS.length) get().show('finale');
    else open(i >= 0 && i < EXPERIMENTS.length ? EXPERIMENTS[i] : null);
  },
  setHovered: (hovered) => set({ hovered }),
  show: (panel) => set({ current: null, panel, hovered: null }),
}));

/** The view named in the URL hash: an experiment id, `computer`, `finale`, or '' for the lab. */
const viewOf = (s: Pick<LabState, 'current' | 'panel'>) => s.current ?? s.panel ?? '';

/**
 * Keeps the URL hash in step with the open experiment (or `#computer` / `#finale`), so the browser's Back
 * button returns to the lab and links like `#qubits` open an experiment directly.
 */
export function initLabHistory(): () => void {
  const hash = () => location.hash.slice(1);
  const apply = (view: string) => {
    const lab = useLab.getState();
    if (view === viewOf(lab)) return;
    if (isPanel(view)) lab.show(view);
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
