import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { TIER_PARAMS, type Tier } from '../lib/quality';

export type TierPref = 'auto' | Tier;
export type MotionPref = 'system' | 'reduce' | 'full';
export type ExplainMode = 'simple' | 'technical';

interface SettingsState {
  tierPref: TierPref;
  autoTier: Tier;
  motionPref: MotionPref;
  systemReducedMotion: boolean;
  explain: ExplainMode;
  setTierPref(t: TierPref): void;
  setAutoTier(t: Tier): void;
  setMotionPref(m: MotionPref): void;
  setSystemReducedMotion(v: boolean): void;
  setExplain(m: ExplainMode): void;
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
      explain: 'simple',
      setTierPref: (tierPref) => set({ tierPref }),
      setAutoTier: (autoTier) => set({ autoTier }),
      setMotionPref: (motionPref) => set({ motionPref }),
      setSystemReducedMotion: (systemReducedMotion) => set({ systemReducedMotion }),
      setExplain: (explain) => set({ explain }),
    }),
    {
      name: 'quantum-explainer-settings',
      storage: safeStorage,
      partialize: (s) => ({ tierPref: s.tierPref, motionPref: s.motionPref, explain: s.explain }),
    },
  ),
);

export const selectTier = (s: SettingsState): Tier => (s.tierPref === 'auto' ? s.autoTier : s.tierPref);
export const selectReducedMotion = (s: SettingsState): boolean =>
  s.motionPref === 'reduce' || (s.motionPref === 'system' && s.systemReducedMotion);

export const useTier = () => useSettings(selectTier);
export const useTierParams = () => TIER_PARAMS[useSettings(selectTier)];
export const useReducedMotion = () => useSettings(selectReducedMotion);
