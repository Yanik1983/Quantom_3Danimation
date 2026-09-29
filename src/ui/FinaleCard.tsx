import { useEffect, useId, useRef } from 'react';
import { useContent, useUi } from '../content/i18n';
import { EXPERIMENTS, useLab } from '../state/lab';
import { RichText } from './RichText';

/** The ending after step 4: the three tricks, what quantum computers are for, and a myth. */
export function FinaleCard() {
  const show = useLab((s) => s.panel === 'finale');
  const { FINALE } = useContent();
  const t = useUi();
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (show) heading.current?.focus({ preventScroll: true });
  }, [show]);
  if (!show) return null;
  const lab = useLab.getState();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex max-h-[62svh] flex-col md:inset-x-auto md:top-16 md:bottom-4 md:start-4 md:max-h-none md:w-[420px] lg:start-6 lg:w-[440px]">
      <section
        aria-labelledby={titleId}
        className="glass card-scroll animate-sheet pointer-events-auto flex max-h-full flex-col overflow-y-auto rounded-t-3xl p-5 md:rounded-3xl md:p-6"
      >
        <p className="text-xs font-semibold tracking-[0.18em] text-cyan uppercase rtl:tracking-normal">
          {t.finaleLabel}
        </p>
        <h2
          id={titleId}
          ref={heading}
          tabIndex={-1}
          className="mt-1.5 font-display text-2xl font-semibold text-white outline-none md:text-3xl"
        >
          {FINALE.title}
        </h2>
        <ol className="mt-3 space-y-1.5 text-[15px] leading-relaxed text-slate-300">
          {FINALE.tricks.map((line, i) => (
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
        <p className="mt-3 rounded-xl border border-cyan/25 bg-cyan/[0.06] px-3.5 py-2.5 text-sm leading-relaxed text-slate-200">
          <RichText text={FINALE.together} />
        </p>

        <h3 className="mt-5 font-display text-lg font-semibold text-white">{FINALE.usesTitle}</h3>
        <ul className="mt-1.5 list-disc space-y-1 ps-5 text-sm leading-relaxed text-slate-300 marker:text-cyan">
          {FINALE.uses.map((line, i) => (
            <li key={i}>
              <RichText text={line} />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{FINALE.wont}</p>

        <h3 className="mt-5 font-display text-lg font-semibold text-white">{FINALE.mythTitle}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
          <RichText text={FINALE.myth} />
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => lab.show('computer')}
            className="rounded-full border border-amber-300/50 bg-amber-300/10 px-4 py-2 font-medium text-amber-200 hover:bg-amber-300/20"
          >
            {FINALE.machine}
          </button>
          <button
            type="button"
            onClick={() => lab.open(EXPERIMENTS[0])}
            className="rounded-full border border-white/15 px-4 py-2 text-slate-200 hover:border-white/40"
          >
            {FINALE.again}
          </button>
        </div>
        <button
          type="button"
          onClick={() => lab.open(null)}
          className="mt-3 self-start rounded-full px-1 py-2 text-sm text-slate-300 hover:text-white"
        >
          {t.backToLab}
        </button>
      </section>
    </div>
  );
}
