import { create } from 'zustand';

export const DEFAULT_RATE = 6;

interface DoubleSlitState {
  /** Particles emitted per second. */
  rate: number;
  measuring: boolean;
  showPrediction: boolean;
  status: 'idle' | 'computing' | 'ready' | 'error';
  progress: number;
  detected: number;
  /** Incremented to ask the scene to clear the screen. */
  clearToken: number;
  setRate(r: number): void;
  setMeasuring(m: boolean): void;
  setShowPrediction(s: boolean): void;
  clear(): void;
  reset(): void;
}

export const useDoubleSlit = create<DoubleSlitState>()((set) => ({
  rate: DEFAULT_RATE,
  measuring: false,
  showPrediction: false,
  status: 'idle',
  progress: 0,
  detected: 0,
  clearToken: 0,
  setRate: (rate) => set({ rate }),
  // Switching the detectors changes the experiment, so start a fresh screen.
  setMeasuring: (measuring) => set((s) => ({ measuring, clearToken: s.clearToken + 1 })),
  setShowPrediction: (showPrediction) => set({ showPrediction }),
  clear: () => set((s) => ({ clearToken: s.clearToken + 1 })),
  reset: () =>
    set((s) => ({
      rate: DEFAULT_RATE,
      measuring: false,
      showPrediction: false,
      clearToken: s.clearToken + 1,
    })),
}));
