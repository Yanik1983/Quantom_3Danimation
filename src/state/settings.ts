import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { TIER_PARAMS, type Tier } from '../lib/quality';

export type TierPref = 'auto' | Tier;
export type MotionPref = 'system' | 'reduce' | 'full';

interface SettingsState {
  tierPref: TierPref;
  autoTier: Tier;
  motionPref: MotionPref;
  systemReducedMotion: boolean;
  setTierPref(t: TierPref): void;
  setAutoTier(t: Tier): void;
  setMotionPref(m: MotionPref): void;
  setSystemReducedMotion(v: boolean): void;
}

const safeStorage = createJSONStorage(() => {
  try {
    const s = window.localStorage;
    s.getItem('probe');
    return s;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
});

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      tierPref: 'auto',
      autoTier: 'medium',
      motionPref: 'system',
      systemReducedMotion:
        typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
      setTierPref: (tierPref) => set({ tierPref }),
      setAutoTier: (autoTier) => set({ autoTier }),
      setMotionPref: (motionPref) => set({ motionPref }),
      setSystemReducedMotion: (systemReducedMotion) => set({ systemReducedMotion }),
    }),
    {
      name: 'quantum-explainer-settings',
      storage: safeStorage,
      partialize: (s) => ({ tierPref: s.tierPref, motionPref: s.motionPref }),
    },
  ),
);

export const selectTier = (s: SettingsState): Tier => (s.tierPref === 'auto' ? s.autoTier : s.tierPref);
export const selectReducedMotion = (s: SettingsState): boolean =>
  s.motionPref === 'reduce' || (s.motionPref === 'system' && s.systemReducedMotion);

export const useTier = () => useSettings(selectTier);
export const useTierParams = () => TIER_PARAMS[useSettings(selectTier)];
export const useReducedMotion = () => useSettings(selectReducedMotion);
