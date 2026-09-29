import type { Tier } from '../lib/quality';
import { useLang, type Lang } from '../state/settings';
import * as en from './experiments';
import * as he from './experiments.he';

/**
 * Interface strings (buttons, labels, live results) per language. Result strings may use
 * `**bold**`, rendered by RichText. Experiment copy lives in experiments(.he).ts.
 */
const UI_EN = {
  dir: 'ltr' as 'ltr' | 'rtl',
  appName: 'Quantum Lab',
  documentTitle: 'Quantum Lab: quantum physics, simply explained',
  /** The switch shows the other language, in that language. */
  switchTo: { label: 'עברית', lang: 'he' as Lang, aria: 'Switch to Hebrew' },

  experimentOf: (i: number, n: number, name: string) => `Experiment ${i} of ${n} · ${name}`,
  experimentControls: 'Experiment controls',
  loading: 'Loading…',
  experimentNavigation: 'Experiment navigation',
  backToLab: '← Back to lab',
  previous: 'Previous',
  previousAria: 'Previous experiment',
  next: 'Next',
  nextAria: 'Next experiment',
  finish: 'Finish',
  finishAria: 'Finish and return to the lab',
  experiments: 'Experiments',
  visited: '(visited)',
  learnMore: 'Learn more',

  settings: 'Settings',
  visualQuality: 'Visual quality',
  motion: 'Motion',
  tier: { low: 'Low', medium: 'Medium', high: 'High' } as Record<Tier, string>,
  auto: (tier: string) => `Auto (${tier.toLowerCase()})`,
  system: (reduced: boolean) => `System (${reduced ? 'reduced' : 'full'})`,
  reduced: 'Reduced',
  full: 'Full',
  settingsNote:
    'Auto quality watches your frame rate and adjusts particle counts and effects. Reduced motion replaces camera glides with cuts; experiments stay interactive.',

  // What is quantum physics? (double slit)
  zoom: 'Zoom',
  zoomStages: ['a grain of sand', 'atoms inside the grain', 'one atom'] as readonly [string, string, string],
  simError: 'The simulation could not start in this browser.',
  preparing: 'Preparing the simulation…',
  stopFiring: 'Stop firing',
  fire: 'Fire particles',
  watchSlits: 'Watch the slits',
  landed: (n: number) => `${n} particles have landed.`,
  watchedDesc: 'Detectors watch the slits: the dots form one smooth band, with no stripes.',
  unwatchedDesc: 'The slits are not watched: the dots build up bright and dark stripes.',

  // Superposition
  leftRight: 'Left ↔ Right',
  leftRightValue: (l: string, r: string) => `${l} left · ${r} right`,
  look: 'Look',
  lookMany: (n: number) => `Look ${n} times`,
  found: (box: 'left' | 'right') => `Found in the **${box}** box.`,
  tally: (l: number, r: number) => `Left box: **${l}** · Right box: **${r}**`,
  mixDesc: (l: string, r: string) => `The particle is a mix: ${l} chance left, ${r} chance right.`,

  // Qubits
  mix01: 'Mix of 0 and 1',
  mix01Value: (p0: string, p1: string) => `${p0} of 0 · ${p1} of 1`,
  measure: 'Measure',
  qubitCount: 'Number of qubits',
  qubitCountValue: (n: number, p: number) => `${n} → ${p} possibilities`,
  result: 'Result:',
  holds: (n: number, p: number) =>
    `${n} ${n === 1 ? 'qubit holds' : 'qubits hold'} ${p} possibilities at once.`,

  // Entanglement
  measurePair: 'Measure a pair',
  measureMany: (n: number) => `Measure ${n} pairs`,
  up: '↑ up',
  down: '↓ down',
  pairResult: (l: string, r: string) => `Left: **${l}** · Right: **${r}**`,
  opposite: (o: number, p: number) => `Opposite: **${o}** of ${p}`,
  leftWas: (up: number, down: number) => {
    const times = (n: number) => `${n} ${n === 1 ? 'time' : 'times'}`;
    return `(left was up ${times(up)}, down ${times(down)})`;
  },
};

export type UiStrings = typeof UI_EN;

const UI_HE: UiStrings = {
  dir: 'rtl',
  appName: 'המעבדה הקוונטית',
  documentTitle: 'המעבדה הקוונטית: פיזיקה קוונטית, בפשטות',
  switchTo: { label: 'English', lang: 'en', aria: 'החלפה לאנגלית' },

  experimentOf: (i, n, name) => `ניסוי ${i} מתוך ${n} · ${name}`,
  experimentControls: 'פקדי הניסוי',
  loading: 'טוען…',
  experimentNavigation: 'ניווט בין הניסויים',
  backToLab: '→ חזרה למעבדה',
  previous: 'הקודם',
  previousAria: 'הניסוי הקודם',
  next: 'הבא',
  nextAria: 'הניסוי הבא',
  finish: 'סיום',
  finishAria: 'סיום וחזרה למעבדה',
  experiments: 'ניסויים',
  visited: '(הושלם)',
  learnMore: 'לקריאה נוספת',

  settings: 'הגדרות',
  visualQuality: 'איכות תצוגה',
  motion: 'תנועה',
  tier: { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' },
  auto: (tier) => `אוטומטית (${tier})`,
  system: (reduced) => `לפי המערכת (${reduced ? 'מופחתת' : 'מלאה'})`,
  reduced: 'מופחתת',
  full: 'מלאה',
  settingsNote:
    'איכות אוטומטית עוקבת אחרי קצב הפריימים ומתאימה את מספר החלקיקים ואת האפקטים. תנועה מופחתת מחליפה את תנועות המצלמה במעברים מיידיים; הניסויים נשארים אינטראקטיביים.',

  zoom: 'זום',
  zoomStages: ['גרגר חול', 'אטומים בתוך הגרגר', 'אטום אחד'],
  simError: 'לא ניתן להפעיל את הסימולציה בדפדפן הזה.',
  preparing: 'מכין את הסימולציה…',
  stopFiring: 'הפסקת ירי',
  fire: 'ירי חלקיקים',
  watchSlits: 'צפייה בסדקים',
  landed: (n) => `${n} חלקיקים נחתו.`,
  watchedDesc: 'גלאים צופים בסדקים: הנקודות יוצרות פס חלק אחד, בלי פסים.',
  unwatchedDesc: 'אין צפייה בסדקים: הנקודות בונות פסים בהירים וכהים.',

  leftRight: 'שמאל ↔ ימין',
  leftRightValue: (l, r) => `שמאל ${l} · ימין ${r}`,
  look: 'הסתכלו',
  lookMany: (n) => `הסתכלו ${n} פעמים`,
  found: (box) => `נמצא בקופסה ה**${box === 'left' ? 'שמאלית' : 'ימנית'}**.`,
  tally: (l, r) => `קופסה שמאלית: **${l}** · קופסה ימנית: **${r}**`,
  mixDesc: (l, r) => `החלקיק בערבוב: סיכוי של ${l} לשמאל ושל ${r} לימין.`,

  mix01: 'ערבוב של 0 ו־1',
  mix01Value: (p0, p1) => `${p0} ל־0 · ${p1} ל־1`,
  measure: 'מדדו',
  qubitCount: 'מספר קיוביטים',
  qubitCountValue: (n, p) => `${n} ← ${p} אפשרויות`,
  result: 'תוצאה:',
  holds: (n, p) =>
    n === 1 ? `קיוביט אחד מחזיק ${p} אפשרויות בבת אחת.` : `${n} קיוביטים מחזיקים ${p} אפשרויות בבת אחת.`,

  measurePair: 'מדדו זוג',
  measureMany: (n) => `מדדו ${n} זוגות`,
  up: '↑ למעלה',
  down: '↓ למטה',
  pairResult: (l, r) => `שמאל: **${l}** · ימין: **${r}**`,
  opposite: (o, p) => `הפוכים: **${o}** מתוך ${p}`,
  leftWas: (up, down) => {
    const times = (n: number) => (n === 1 ? 'פעם אחת' : `${n} פעמים`);
    return `(השמאלי היה למעלה ${times(up)}, ולמטה ${times(down)})`;
  },
};

export const UI: Record<Lang, UiStrings> = { en: UI_EN, he: UI_HE };

export interface Content {
  COPY: typeof en.COPY;
  WELCOME: typeof en.WELCOME;
  ENDING: string;
  LAB_ALT: string;
}

export const CONTENT: Record<Lang, Content> = { en, he };

/** Interface strings in the current language. */
export const useUi = () => UI[useLang()];
/** Experiment copy in the current language. */
export const useContent = () => CONTENT[useLang()];
