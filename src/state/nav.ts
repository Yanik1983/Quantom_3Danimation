import { create } from 'zustand';

interface NavState {
  /** Continuous scroll position in station units: i + fraction through station i. */
  p: number;
  /** Station the viewer is currently "at" (changes mid-flight). */
  active: number;
  setP(p: number): void;
}

/** Fraction of a section's scroll range at which the camera has flown halfway to the next station. */
export const FLIGHT_START = 0.55;
export const FLIGHT_MID = (1 + FLIGHT_START) / 2;

export const useNav = create<NavState>()((set, get) => ({
  p: 0,
  active: 0,
  setP: (p) => {
    const active = Math.floor(p + (1 - FLIGHT_MID));
    if (active !== get().active) set({ p, active });
    else set({ p });
  },
}));
