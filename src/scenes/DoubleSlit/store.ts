import { create } from 'zustand';

/** Emission rate while the lab table idles (particles / s). */
export const IDLE_RATE = 10;
export const MAX_RATE = 800;

/**
 * Firing starts slowly, so single dots can be followed, then speeds up so the pattern builds
 * within seconds: rate(t) = 2 + 6t² per second, capped.
 */
export const fireRate = (secondsFiring: number) => Math.min(MAX_RATE, 2 + 6 * secondsFiring * secondsFiring);

interface DoubleSlitState {
  firing: boolean;
  /** Which-path detectors at the slits. */
  measuring: boolean;
  /** 0 = grain of sand … 1 = one atom. */
  zoom: number;
  status: 'idle' | 'computing' | 'ready' | 'error';
  progress: number;
  detected: number;
  /** Incremented to ask the scene to clear the screen. */
  clearToken: number;
  setFiring(f: boolean): void;
  setMeasuring(m: boolean): void;
  setZoom(z: number): void;
  reset(): void;
}

export const useDoubleSlit = create<DoubleSlitState>()((set) => ({
  firing: false,
  measuring: false,
  zoom: 0,
  status: 'idle',
  progress: 0,
  detected: 0,
  clearToken: 0,
  setFiring: (firing) => set({ firing }),
  // Switching the detectors changes the experiment, so start a fresh screen.
  setMeasuring: (measuring) => set((s) => ({ measuring, clearToken: s.clearToken + 1, detected: 0 })),
  setZoom: (zoom) => set({ zoom }),
  reset: () =>
    set((s) => ({ firing: false, measuring: false, zoom: 0, detected: 0, clearToken: s.clearToken + 1 })),
}));
