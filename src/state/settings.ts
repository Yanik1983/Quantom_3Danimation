import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { TIER_PARAMS, type Tier } from '../lib/quality';

export type TierPref = 'auto' | Tier;
export type MotionPref = 'system' | 'reduce' | 'full';
export type Lang = 'en' | 'he';
export const LANGS: readonly Lang[] = ['en', 'he'];

/** First visit: `?lang=he` wins, then the browser language. Later visits use the saved choice. */
function initialLang(): Lang {
  if (typeof location !== 'undefined') {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'he' || q === 'en') return q;
  }
  return typeof navigator !== 'undefined' && /^(he|iw)\b/i.test(navigator.language) ? 'he' : 'en';
}

interface SettingsState {
  tierPref: TierPref;
  autoTier: Tier;
  motionPref: MotionPref;
  lang: Lang;
  /** Sound effects (on by default; nothing plays before the first click, as browsers require). */
  sound: boolean;
  /** Background lab hum: the refrigerator's pump and the electronics (off by default). */
  ambient: boolean;
  systemReducedMotion: boolean;
  setTierPref(t: TierPref): void;
  setAutoTier(t: Tier): void;
  setMotionPref(m: MotionPref): void;
  setLang(l: Lang): void;
  setSound(v: boolean): void;
  setAmbient(v: boolean): void;
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
      lang: initialLang(),
      sound: true,
      ambient: false,
      systemReducedMotion:
        typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
      setTierPref: (tierPref) => set({ tierPref }),
      setAutoTier: (autoTier) => set({ autoTier }),
      setMotionPref: (motionPref) => set({ motionPref }),
      setLang: (lang) => set({ lang }),
      setSound: (sound) => set({ sound }),
      setAmbient: (ambient) => set({ ambient }),
      setSystemReducedMotion: (systemReducedMotion) => set({ systemReducedMotion }),
    }),
    {
      name: 'quantum-explainer-settings',
      storage: safeStorage,
      partialize: (s) => ({
        tierPref: s.tierPref,
        motionPref: s.motionPref,
        lang: s.lang,
        sound: s.sound,
        ambient: s.ambient,
      }),
      // An explicit ?lang= link overrides the saved choice.
      merge: (saved, current) => {
        const merged = { ...current, ...(saved as Partial<SettingsState>) };
        const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null;
        if (q === 'he' || q === 'en') merged.lang = q;
        return merged;
      },
    },
  ),
);

export const selectTier = (s: SettingsState): Tier => (s.tierPref === 'auto' ? s.autoTier : s.tierPref);
export const selectReducedMotion = (s: SettingsState): boolean =>
  s.motionPref === 'reduce' || (s.motionPref === 'system' && s.systemReducedMotion);

export const useTier = () => useSettings(selectTier);
export const useTierParams = () => TIER_PARAMS[useSettings(selectTier)];
export const useReducedMotion = () => useSettings(selectReducedMotion);
export const useLang = () => useSettings((s) => s.lang);
