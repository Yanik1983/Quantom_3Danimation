import { useEffect, useId, useRef } from 'react';
import { useContent, useUi } from '../content/i18n';
import { useLab } from '../state/lab';
import { RichText } from './RichText';

/** What the gold machine is: shown when it is clicked in the lab (camera glides to it). */
export function ComputerCard() {
  const show = useLab((s) => s.computer);
  const { COMPUTER } = useContent();
  const t = useUi();
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (show) heading.current?.focus({ preventScroll: true });
  }, [show]);
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex max-h-[58svh] flex-col md:inset-x-auto md:top-16 md:bottom-auto md:start-4 md:max-h-none md:w-[400px] lg:start-6 lg:w-[420px]">
      <section
        aria-labelledby={titleId}
        className="glass card-scroll animate-sheet pointer-events-auto flex max-h-full flex-col overflow-y-auto rounded-t-3xl p-5 md:rounded-3xl md:p-6"
      >
        <h2
          id={titleId}
          ref={heading}
          tabIndex={-1}
          className="font-display text-2xl font-semibold text-white outline-none md:text-3xl"
        >
          {COMPUTER.title}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
          <RichText text={COMPUTER.text} />
        </p>
        <button
          type="button"
          onClick={() => useLab.getState().open(null)}
          className="mt-5 self-start rounded-full px-1 py-2 text-sm text-slate-300 hover:text-white"
        >
          {t.closeComputer}
        </button>
      </section>
    </div>
  );
}
