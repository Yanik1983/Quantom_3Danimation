import { Suspense, useEffect, useId, useRef } from 'react';
import { useContent, useUi } from '../content/i18n';
import { SCENES } from '../scenes/registry';
import { EXPERIMENTS, useLab, type ExperimentId } from '../state/lab';
import { LearnMore } from './LearnMore';
import { RichText } from './RichText';

function Card({ id }: { id: ExperimentId }) {
  const { COPY } = useContent();
  const copy = COPY[id];
  const t = useUi();
  const { Controls } = SCENES[id];
  const index = EXPERIMENTS.indexOf(id);
  const last = index === EXPERIMENTS.length - 1;
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const step = useLab((s) => s.step);
  const open = useLab((s) => s.open);

  // Move keyboard / screen-reader focus to the new experiment.
  useEffect(() => heading.current?.focus({ preventScroll: true }), [id]);

  return (
    <section
      aria-labelledby={titleId}
      className="glass card-scroll animate-sheet pointer-events-auto flex max-h-full flex-col overflow-y-auto rounded-t-3xl p-5 md:rounded-3xl md:p-6"
    >
      <p className="text-xs font-semibold tracking-[0.18em] text-cyan uppercase rtl:tracking-normal">
        {t.stepOf(index + 1, EXPERIMENTS.length)}
      </p>
      <h2
        id={titleId}
        ref={heading}
        tabIndex={-1}
        className="mt-1.5 font-display text-2xl font-semibold text-white outline-none md:text-3xl"
      >
        {copy.title}
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
        <RichText text={copy.text} />
      </p>
      <p className="sr-only">{copy.altText}</p>

      <p className="mt-4 text-xs font-semibold text-cyan">{t.tryIt}</p>
      <ol className="mt-1 space-y-0.5 text-sm leading-relaxed text-slate-200">
        {copy.tryIt.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-display text-cyan" aria-hidden="true">
              {i + 1}.
            </span>
            <span>
              <RichText text={line} />
            </span>
          </li>
        ))}
      </ol>

      <div role="group" aria-label={t.experimentControls} className="mt-4 space-y-4">
        <Suspense fallback={<p className="text-sm text-slate-400">{t.loading}</p>}>
          <Controls />
        </Suspense>
      </div>

      <div className="mt-5 rounded-xl border border-cyan/25 bg-cyan/[0.06] px-3.5 py-2.5 text-sm leading-relaxed text-slate-200">
        <p className="text-xs font-semibold text-cyan">{t.inComputer}</p>
        <p className="mt-0.5">
          <RichText text={copy.inComputer} />
        </p>
      </div>

      <div className="mt-5">
        <LearnMore copy={copy.learnMore} label={t.learnMore} />
      </div>

      <nav
        aria-label={t.experimentNavigation}
        className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm"
      >
        <button
          type="button"
          onClick={() => open(null)}
          className="rounded-full px-1 py-2 text-slate-300 hover:text-white"
        >
          {t.backToLab}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={index === 0}
            aria-label={t.previousAria}
            className="rounded-full border border-white/15 px-3.5 py-2 text-slate-200 hover:border-white/40 disabled:opacity-40"
          >
            {t.previous}
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={last ? t.finishAria : undefined}
            className="rounded-full border border-cyan/50 bg-cyan/10 px-3.5 py-2 text-cyan hover:bg-cyan/20"
          >
            {last ? t.finish : t.nextTo(COPY[EXPERIMENTS[index + 1]].name)}
          </button>
        </div>
      </nav>
    </section>
  );
}

/** The open experiment's card: left column on wide screens, a bottom sheet on phones. */
export function ExperimentCard() {
  const current = useLab((s) => s.current);
  if (!current) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex max-h-[52svh] flex-col md:inset-x-auto md:top-16 md:bottom-4 md:start-4 md:max-h-none md:w-[400px] lg:start-6 lg:w-[420px]">
      <div className="mt-auto flex min-h-0 flex-col md:mt-0">
        <Card key={current} id={current} />
      </div>
    </div>
  );
}
