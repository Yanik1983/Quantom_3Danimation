import { Suspense } from 'react';
import { CONTENT } from '../content';
import type { SectionMeta } from '../content/sections';
import { SCENES } from '../scenes/registry';
import { useNav } from '../state/nav';
import { useSettings } from '../state/settings';
import { Analogy } from './Analogy';
import { ExplainToggle } from './ExplainToggle';
import { GlassCard } from './GlassCard';
import { RichText } from './RichText';
import { UnderTheHood } from './UnderTheHood';

/**
 * A tall scroll section. The card is sticky while the camera dwells at the station,
 * then scrolls away as the camera flies to the next one.
 */
export function Section({ meta, index }: { meta: SectionMeta; index: number }) {
  const content = CONTENT[meta.id];
  const entry = SCENES[meta.id];
  const explain = useSettings((s) => s.explain);
  const near = useNav((s) => Math.abs(s.active - meta.station) <= 1);
  const paragraphs = content ? (explain === 'simple' ? content.simple : content.technical) : [];
  const isLast = index === 7;

  return (
    <section
      id={meta.id}
      data-station={meta.station}
      aria-labelledby={`${meta.id}-title`}
      className={`pointer-events-none relative ${isLast ? 'h-[170vh]' : 'h-[220vh]'}`}
    >
      <div className="sticky top-0 flex h-svh items-center px-4 pt-16 pb-4 max-md:items-end md:px-8 md:pr-20">
        <GlassCard className="card-scroll pointer-events-auto w-full space-y-4 overflow-y-auto p-5 max-md:max-h-[54svh] md:max-h-[calc(100svh-6rem)] md:w-[27rem] md:p-6 lg:w-[31rem]">
          <header className="space-y-1">
            <p className="font-display text-xs font-medium tracking-[0.2em] text-cyan uppercase">
              {String(index + 1).padStart(2, '0')} · {meta.kicker}
            </p>
            <h2
              id={`${meta.id}-title`}
              className="font-display text-2xl font-semibold text-white md:text-3xl"
            >
              {meta.title}
            </h2>
          </header>
          {content && (
            <>
              <ExplainToggle />
              <div className="space-y-3 text-[0.95rem] leading-relaxed text-slate-300" aria-live="polite">
                {paragraphs.map((p, i) => (
                  <p key={`${explain}-${i}`}>
                    <RichText text={p} />
                  </p>
                ))}
              </div>
              {content.analogy && <Analogy text={content.analogy} />}
              <p className="sr-only">Visualization: {content.altText}</p>
            </>
          )}
          {entry && near && (
            <Suspense fallback={<div className="h-40" aria-hidden="true" />}>
              <entry.Controls />
            </Suspense>
          )}
          {content && <UnderTheHood data={content.underTheHood} />}
        </GlassCard>
      </div>
    </section>
  );
}
