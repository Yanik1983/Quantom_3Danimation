import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { CONTENT } from '.';

const words = (paras: string[]) =>
  paras
    .join(' ')
    .replace(/\$[^$]+\$/g, 'x')
    .split(/\s+/)
    .filter(Boolean).length;

describe('scientific copy', () => {
  for (const [id, c] of Object.entries(CONTENT)) {
    if (!c) continue;
    it(`${id}: simple and technical copy are 120–200 words`, () => {
      expect(words(c.simple)).toBeGreaterThanOrEqual(120);
      expect(words(c.simple)).toBeLessThanOrEqual(200);
      expect(words(c.technical)).toBeGreaterThanOrEqual(120);
      expect(words(c.technical)).toBeLessThanOrEqual(200);
    });

    it(`${id}: every equation renders with KaTeX`, () => {
      const inline = [...c.simple, ...c.technical, ...c.underTheHood.method, c.analogy ?? '']
        .flatMap((p) => p.match(/\$[^$]+\$/g) ?? [])
        .map((m) => m.slice(1, -1));
      const display = c.underTheHood.equations.flatMap((e) => [
        e.tex,
        ...(e.caption.match(/\$[^$]+\$/g) ?? []).map((m) => m.slice(1, -1)),
      ]);
      for (const tex of [...inline, ...display]) {
        expect(() => katex.renderToString(tex, { throwOnError: true })).not.toThrow();
      }
    });

    it(`${id}: never attributes collapse to consciousness`, () => {
      const all = [...c.simple, ...c.technical, c.analogy ?? '', c.altText].join(' ').toLowerCase();
      expect(all).not.toMatch(/conscious|observer creates|mind causes|looking causes/);
    });
  }
});
