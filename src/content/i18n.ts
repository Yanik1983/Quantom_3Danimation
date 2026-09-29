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
  documentTitle: 'Quantum Lab: how a quantum computer works, simply explained',
  /** The switch shows the other language, in that language. */
  switchTo: { label: 'עברית', lang: 'he' as Lang, aria: 'Switch to Hebrew' },

  stepOf: (i: number, n: number) => `Step ${i} of ${n}`,
  experimentControls: 'Experiment controls',
  loading: 'Loading…',
  experimentNavigation: 'Step navigation',
  backToLab: '← Back to lab',
  previous: 'Previous',
  previousAria: 'Previous step',
  nextTo: (name: string) => `Next: ${name}`,
  finish: 'Finish',
  finishAria: 'Finish and see what you learned',
  experiments: 'Steps',
  visited: '(visited)',
  learnMore: 'Learn more',
  tryIt: 'Try it',
  whatYouSaw: 'What you saw',
  inComputer: 'In the quantum computer',
  closeComputer: '← Back to lab',
  computerLabel: 'The quantum computer',
  finaleLabel: 'What you learned',

  settings: 'Settings',
  sound: 'Sound effects',
  labHum: 'Lab hum',
  on: 'On',
  off: 'Off',
  labHumNote:
    'The low hum of the lab and the steady pump of the gold refrigerator, as in a real quantum-computing lab.',
  visualQuality: 'Visual quality',
  motion: 'Motion',
  tier: { low: 'Low', medium: 'Medium', high: 'High' } as Record<Tier, string>,
  auto: (tier: string) => `Auto (${tier.toLowerCase()})`,
  system: (reduced: boolean) => `System (${reduced ? 'reduced' : 'full'})`,
  reduced: 'Reduced',
  full: 'Full',
  settingsNote:
    'Auto quality watches your frame rate and adjusts particle counts and effects. Reduced motion replaces camera glides with cuts; experiments stay interactive.',

  // Step 1: waves (double slit)
  simError: 'The simulation could not start in this browser.',
  preparing: 'Preparing the simulation…',
  stopFiring: 'Stop firing',
  fire: 'Fire',
  detectors: 'Detectors on the slits',
  landed: (n: number) => `${n} particles have landed.`,
  sawLanding: 'Dots are landing one by one, each at a random place. Keep watching…',
  sawStripes:
    'Stripes! Each particle passes through **both slits** like a wave. Where the two waves meet they **add up** (bright) or **cancel** (dark), like noise-cancelling headphones.',
  sawDetectorsReady:
    'The detectors will record which slit each particle takes. Press **Fire** to see what changes.',
  sawDetecting: 'The detectors record which slit each particle takes. Keep firing…',
  sawNoStripes:
    'The stripes are gone: just one smooth band. Detecting the path **disturbs the waves**, so they no longer cancel.',

  // Step 2: qubits
  mix01: 'Mix of 0 and 1',
  mix01Value: (p0: string, p1: string) => `${p0} 0 · ${p1} 1`,
  measure: 'Measure',
  measureTimes: (n: number) => `Measure ${n} times`,
  qubitCount: 'Qubits',
  qubitCountValue: (n: number, p: number) => `${n} → ${p} possible results`,
  addQubit: 'Add a qubit',
  removeQubit: 'Remove a qubit',
  sawOne: (bit: number) =>
    `Result: **${bit}**. The cloud is gone: measuring found the particle in one box. Measure again, and the result is random.`,
  sawMany: (bits: string, p: number) =>
    `Result: **${bits}**. Each qubit gave one bit, so together they gave just one of the ${p} possible results.`,
  sawTally: (zeros: number, ones: number) =>
    `0 came up **${zeros}** times and 1 came up **${ones}** times: the mix sets the chances, but each result is random.`,
  sawSpread: (kinds: number, p: number, top: string, times: number) =>
    `100 measurements gave **${kinds}** different results out of ${p} possible; the most common was **${top}** (${times} times). Each measurement gave just one.`,
  sawDoubling: (n: number, p: number) =>
    `${n} qubits make a mix of **${p}** possible results at once. Each extra qubit doubles it: 50 qubits make more than a million billion.`,

  // Step 3: linked qubits
  measurePair: 'Measure a pair',
  measurePairs: (n: number) => `Measure ${n} pairs`,
  sawFirstPair: (l: number, r: number) =>
    `Left: **${l}** · Right: **${r}**. ${l === r ? 'The same!' : 'Different.'} Try again: each result is random.`,
  sawPairs: (m: number, p: number, zeros: number) =>
    `**${m} of ${p}** pairs matched, yet each result was random (the left one read 0 ${zeros} ${zeros === 1 ? 'time' : 'times'} and 1 ${p - zeros} ${p - zeros === 1 ? 'time' : 'times'}).`,
  sawGloves:
    'Isn’t that like a pair of gloves, decided in advance? No: experiments that won the 2022 Nobel Prize showed that the results are not decided before measuring.',

  // Step 4: find the card
  liftCup: (cup: string) => `Lift cup ${cup}`,
  sawEmpty: (tries: number) => `Empty (${tries} ${tries === 1 ? 'try' : 'tries'} so far). Lift another cup.`,
  sawClassicFound: (tries: number) =>
    `Found on try **${tries}**! Checking one cup at a time can take up to 4 tries, and a normal computer has to check one by one too.`,
  startQuantum: 'Now let the quantum computer try',
  searchSteps: ['Spread', 'Mark', 'Cancel', 'Measure'] as readonly string[],
  searchStep: (i: number, name: string) => `Step ${i}: ${name}`,
  hideNew: 'Hide a new card',
  searchInfo: [
    'A new card is hidden. The 2 qubits start at 00. The bars above the cups will show each cup’s wave.',
    '**Spread** (trick 2): the qubits are now a mix of all four cups. Each cup has a 25% chance.',
    '**Mark** (trick 3): the right cup’s wave is flipped upside down. Its chance is still 25%, so the card is still hidden. This step links the two qubits.',
    '**Cancel** (trick 1): the waves combine. The wrong cups cancel to 0% and the right cup grows to 100%.',
  ] as readonly string[],
  searchFound: (cup: string) => `Found under cup **${cup}** in one look!`,
  searchChances: (list: string) => `Chances: ${list}.`,
};

export type UiStrings = typeof UI_EN;

const UI_HE: UiStrings = {
  dir: 'rtl',
  appName: 'המעבדה הקוונטית',
  documentTitle: 'המעבדה הקוונטית: איך עובד מחשב קוונטי, בפשטות',
  switchTo: { label: 'English', lang: 'en', aria: 'החלפה לאנגלית' },

  stepOf: (i, n) => `שלב ${i} מתוך ${n}`,
  experimentControls: 'פקדי הניסוי',
  loading: 'טוען…',
  experimentNavigation: 'ניווט בין השלבים',
  backToLab: '→ חזרה למעבדה',
  previous: 'הקודם',
  previousAria: 'השלב הקודם',
  nextTo: (name) => `הבא: ${name}`,
  finish: 'סיום',
  finishAria: 'סיום, וסיכום של מה שלמדתם',
  experiments: 'שלבים',
  visited: '(הושלם)',
  learnMore: 'לקריאה נוספת',
  tryIt: 'נסו',
  whatYouSaw: 'מה ראיתם',
  inComputer: 'במחשב הקוונטי',
  closeComputer: '→ חזרה למעבדה',
  computerLabel: 'המחשב הקוונטי',
  finaleLabel: 'מה למדתם',

  settings: 'הגדרות',
  sound: 'אפקטים קוליים',
  labHum: 'זמזום המעבדה',
  on: 'פועל',
  off: 'כבוי',
  labHumNote:
    'הזמזום השקט של המעבדה והפעימות הקבועות של המשאבה במקרר המוזהב, כמו במעבדת מחשוב קוונטי אמיתית.',
  visualQuality: 'איכות תצוגה',
  motion: 'תנועה',
  tier: { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' },
  auto: (tier) => `אוטומטית (${tier})`,
  system: (reduced) => `לפי המערכת (${reduced ? 'מופחתת' : 'מלאה'})`,
  reduced: 'מופחתת',
  full: 'מלאה',
  settingsNote:
    'איכות אוטומטית עוקבת אחרי קצב הפריימים ומתאימה את מספר החלקיקים ואת האפקטים. תנועה מופחתת מחליפה את תנועות המצלמה במעברים מיידיים; הניסויים נשארים אינטראקטיביים.',

  simError: 'לא ניתן להפעיל את הסימולציה בדפדפן הזה.',
  preparing: 'מכין את הסימולציה…',
  stopFiring: 'הפסקת ירי',
  fire: 'ירי',
  detectors: 'גלאים בסדקים',
  landed: (n) => `${n} חלקיקים נחתו.`,
  sawLanding: 'נקודות נוחתות אחת אחרי השנייה, כל אחת במקום אקראי. המשיכו לצפות…',
  sawStripes:
    'פסים! כל חלקיק עובר דרך **שני הסדקים** כמו גל. איפה ששני הגלים נפגשים הם **מתחזקים** (בהיר) או **מבטלים זה את זה** (כהה), כמו אוזניות מבטלות רעשים.',
  sawDetectorsReady: 'הגלאים ירשמו דרך איזה סדק עובר כל חלקיק. לחצו על **ירי** כדי לראות מה משתנה.',
  sawDetecting: 'הגלאים רושמים דרך איזה סדק עובר כל חלקיק. המשיכו לירות…',
  sawNoStripes: 'הפסים נעלמו: נשאר פס חלק אחד. זיהוי המסלול **מפריע לגלים**, ולכן הם כבר לא מבטלים זה את זה.',

  mix01: 'ערבוב של 0 ו־1',
  mix01Value: (p0, p1) => `${p0} ל־0 · ${p1} ל־1`,
  measure: 'מדדו',
  measureTimes: (n) => `מדדו ${n} פעמים`,
  qubitCount: 'קיוביטים',
  qubitCountValue: (n, p) => `${n} ← ${p} תוצאות אפשריות`,
  addQubit: 'הוספת קיוביט',
  removeQubit: 'הסרת קיוביט',
  sawOne: (bit) =>
    `תוצאה: **${bit}**. הענן נעלם: המדידה מצאה את החלקיק בקופסה אחת. מדדו שוב, והתוצאה אקראית.`,
  sawMany: (bits, p) =>
    `תוצאה: **${bits}**. כל קיוביט נתן ביט אחד, כך שיחד הם נתנו רק אחת מתוך ${p} התוצאות האפשריות.`,
  sawTally: (zeros, ones) =>
    `0 יצא **${zeros}** פעמים ו־1 יצא **${ones}** פעמים: הערבוב קובע את הסיכויים, אבל כל תוצאה אקראית.`,
  sawSpread: (kinds, p, top, times) =>
    `100 מדידות נתנו **${kinds}** תוצאות שונות מתוך ${p} אפשריות; השכיחה ביותר הייתה **${top}** (${times} פעמים). כל מדידה נתנה תוצאה אחת בלבד.`,
  sawDoubling: (n, p) =>
    `${n} קיוביטים יוצרים ערבוב של **${p}** תוצאות אפשריות בבת אחת. כל קיוביט נוסף מכפיל את זה: 50 קיוביטים יוצרים יותר ממיליון מיליארד.`,

  measurePair: 'מדדו זוג',
  measurePairs: (n) => `מדדו ${n} זוגות`,
  sawFirstPair: (l, r) =>
    `שמאל: **${l}** · ימין: **${r}**. ${l === r ? 'אותו דבר!' : 'שונים.'} נסו שוב: כל תוצאה אקראית.`,
  sawPairs: (m, p, zeros) =>
    `**${m} מתוך ${p}** זוגות היו שווים, ובכל זאת כל תוצאה הייתה אקראית (השמאלי קרא 0 ${zeros === 1 ? 'פעם אחת' : `${zeros} פעמים`} ו־1 ${p - zeros === 1 ? 'פעם אחת' : `${p - zeros} פעמים`}).`,
  sawGloves:
    'זה לא כמו זוג כפפות, שנקבע מראש? לא: ניסויים שזכו בפרס נובל לשנת 2022 הראו שהתוצאות לא נקבעות לפני המדידה.',

  liftCup: (cup) => `הרימו את כוס ${cup}`,
  sawEmpty: (tries) => `ריק (${tries === 1 ? 'ניסיון אחד' : `${tries} ניסיונות`} עד עכשיו). הרימו כוס אחרת.`,
  sawClassicFound: (tries) =>
    `נמצא בניסיון **${tries}**! בדיקה של כוס אחת בכל פעם יכולה לדרוש עד 4 ניסיונות, וגם מחשב רגיל חייב לבדוק אחת אחרי השנייה.`,
  startQuantum: 'עכשיו תנו למחשב הקוונטי לנסות',
  searchSteps: ['פיזור', 'סימון', 'ביטול', 'מדידה'],
  searchStep: (i, name) => `שלב ${i}: ${name}`,
  hideNew: 'הסתירו קלף חדש',
  searchInfo: [
    'קלף חדש הוסתר. שני הקיוביטים מתחילים ב־00. העמודות מעל הכוסות יראו את הגל של כל כוס.',
    '**פיזור** (טריק 2): הקיוביטים הם עכשיו ערבוב של כל ארבע הכוסות. לכל כוס סיכוי של 25%.',
    '**סימון** (טריק 3): הגל של הכוס הנכונה מתהפך. הסיכוי שלה עדיין 25%, כך שהקלף עדיין מוסתר. השלב הזה מקשר בין שני הקיוביטים.',
    '**ביטול** (טריק 1): הגלים מתחברים. הכוסות השגויות מתבטלות ל־0% והכוס הנכונה גדלה ל־100%.',
  ],
  searchFound: (cup) => `נמצא מתחת לכוס **${cup}** במבט אחד!`,
  searchChances: (list) => `סיכויים: ${list}.`,
};

export const UI: Record<Lang, UiStrings> = { en: UI_EN, he: UI_HE };

export interface Content {
  COPY: typeof en.COPY;
  WELCOME: typeof en.WELCOME;
  COMPUTER: typeof en.COMPUTER;
  FINALE: typeof en.FINALE;
  LAB_ALT: string;
}

export const CONTENT: Record<Lang, Content> = { en, he };

/** Interface strings in the current language. */
export const useUi = () => UI[useLang()];
/** Experiment copy in the current language. */
export const useContent = () => CONTENT[useLang()];
