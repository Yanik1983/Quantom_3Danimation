import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { EXPERIMENTS } from '../state/lab';
import { CONTENT } from './i18n';

const words = (s: string) => s.replace(/\*\*/g, '').split(/\s+/).filter(Boolean).length;
const inlineMath = (s: string) => [...s.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
const renders = (tex: string, displayMode: boolean) =>
  katex.renderToString(tex, { throwOnError: true, displayMode, strict: 'error' });

/** Measurement is a physical interaction; never suggest that a mind causes collapse. */
const FORBIDDEN = /conscious|observer'?s mind|awareness|human observ|someone (?:looks|watches)|תודע|מודעות/i;

/** Hebrew packs prefixes into words, so the same text has fewer words than in English. */
const MIN_WORDS = { en: 20, he: 16 } as const;
/** Main text before the first button: two or three sentences. */
const MAX_WORDS = 45;

for (const lang of ['en', 'he'] as const) {
  describe(`lab copy (${lang})`, () => {
    const { COPY, WELCOME, FINALE } = CONTENT[lang];
    it('has one entry per experiment', () => {
      expect(Object.keys(COPY).sort()).toEqual([...EXPERIMENTS].sort());
    });

    for (const id of EXPERIMENTS) {
      const c = COPY[id];
      describe(id, () => {
        it('keeps the main text short and equation-free', () => {
          expect(words(c.text)).toBeGreaterThanOrEqual(MIN_WORDS[lang]);
          expect(words(c.text)).toBeLessThanOrEqual(MAX_WORDS);
          expect(c.text).not.toContain('$');
        });

        it('asks a question and says what to try, in a few short lines', () => {
          expect(c.title.trim().endsWith('?')).toBe(true);
          expect(c.tryIt.length).toBeGreaterThanOrEqual(1);
          expect(c.tryIt.length).toBeLessThanOrEqual(3);
          for (const line of c.tryIt) expect(words(line)).toBeLessThanOrEqual(12);
        });

        it('keeps "Learn more" brief', () => {
          const total = c.learnMore.paragraphs.reduce((n, p) => n + words(p), 0);
          expect(total).toBeLessThanOrEqual(110);
          expect(c.learnMore.equations.length).toBeGreaterThan(0);
        });

        it('says briefly how a quantum computer uses it', () => {
          expect(words(c.inComputer)).toBeLessThanOrEqual(30);
          expect(c.inComputer).not.toContain('$');
        });

        it('renders every equation with KaTeX', () => {
          for (const tex of c.learnMore.equations) expect(() => renders(tex, true)).not.toThrow();
          for (const p of c.learnMore.paragraphs)
            for (const tex of inlineMath(p)) expect(() => renders(tex, false)).not.toThrow();
        });

        it('avoids consciousness-causes-collapse phrasing', () => {
          const all = [c.text, c.altText, ...c.learnMore.paragraphs].join(' ');
          expect(all).not.toMatch(FORBIDDEN);
        });
      });
    }

    it('explains the quantum computer briefly', () => {
      const { COMPUTER } = CONTENT[lang];
      expect(words(COMPUTER.text)).toBeLessThanOrEqual(75);
      expect(COMPUTER.text).not.toMatch(FORBIDDEN);
    });

    it('has a short welcome that states the goal', () => {
      expect(words(WELCOME.text)).toBeLessThanOrEqual(40);
    });

    it('ends with the three tricks, uses, and a myth, in plain words', () => {
      expect(FINALE.tricks).toHaveLength(3);
      const all = [FINALE.together, FINALE.wont, FINALE.myth, ...FINALE.tricks, ...FINALE.uses];
      for (const line of all) {
        expect(words(line)).toBeLessThanOrEqual(40);
        expect(line).not.toContain('$');
        expect(line).not.toMatch(FORBIDDEN);
      }
    });
  });
}
