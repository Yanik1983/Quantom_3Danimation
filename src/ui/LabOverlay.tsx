import { useEffect, useRef } from 'react';
import { useContent, useUi } from '../content/i18n';
import { EXPERIMENTS, useLab, type ExperimentId } from '../state/lab';

/** Lab overview: the welcome text and the experiment menu (large tiles on phones). */
export function LabOverlay() {
  const { COPY, FINALE, LAB_ALT, WELCOME } = useContent();
  const t = useUi();
  const current = useLab((s) => s.current);
  const panel = useLab((s) => s.panel);
  const visited = useLab((s) => s.visited);
  const hovered = useLab((s) => s.hovered);
  const lastOpen = useRef<ExperimentId | null>(null);
  const buttons = useRef<Partial<Record<ExperimentId, HTMLButtonElement | null>>>({});
  const allDone = EXPERIMENTS.every((id) => visited.includes(id));
  const open = current === null && panel === null;

  // Returning from an experiment: put keyboard focus back on its menu entry.
  useEffect(() => {
    if (open && lastOpen.current) buttons.current[lastOpen.current]?.focus({ preventScroll: true });
    if (!open) lastOpen.current = current;
  }, [open, current]);

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 top-16 z-20 px-4 text-center transition-opacity duration-500 md:top-20 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <h1 className={`font-display text-2xl font-semibold text-white md:text-4xl ${open ? '' : 'sr-only'}`}>
          {WELCOME.title}
        </h1>
        {open && (
          <div className="animate-fade mx-auto mt-2 max-w-xl space-y-1.5 text-sm text-slate-300 md:mt-3 md:text-base">
            <p>{WELCOME.text}</p>
            <p className="text-slate-400">{WELCOME.time}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => useLab.getState().open(EXPERIMENTS[0])}
                className="pointer-events-auto rounded-full bg-gradient-to-r from-cyan/85 to-violet/85 px-7 py-2.5 font-display text-base font-semibold text-void shadow-[0_0_24px_rgba(34,228,255,0.35)] hover:brightness-110 md:text-lg"
              >
                {allDone ? FINALE.again : WELCOME.start}
              </button>
              {allDone && (
                <button
                  type="button"
                  onClick={() => useLab.getState().show('finale')}
                  className="pointer-events-auto rounded-full border border-cyan/50 bg-cyan/10 px-5 py-2.5 text-sm font-medium text-cyan hover:bg-cyan/20 md:text-base"
                >
                  {t.finaleLabel}
                </button>
              )}
            </div>
            <p className="sr-only">{LAB_ALT}</p>
          </div>
        )}
      </div>

      <nav
        aria-label={t.experiments}
        hidden={!open}
        className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:bottom-5 md:px-6 md:pb-0"
      >
        <p className="mb-2 text-center text-xs text-slate-400 md:text-sm">{WELCOME.choose}</p>
        <ol className="mx-auto grid max-w-md grid-cols-2 gap-2.5 md:flex md:max-w-none md:justify-center md:gap-2">
          {EXPERIMENTS.map((id, i) => {
            const done = visited.includes(id);
            return (
              <li key={id}>
                <button
                  ref={(el) => {
                    buttons.current[id] = el;
                  }}
                  type="button"
                  onClick={() => useLab.getState().open(id)}
                  onPointerEnter={() => useLab.getState().setHovered(id)}
                  onPointerLeave={() => useLab.getState().setHovered(null)}
                  className={`glass flex h-full min-h-20 w-full flex-col items-start justify-between gap-1 rounded-2xl px-4 py-3 text-start transition-colors md:min-h-0 md:flex-row md:items-center md:gap-2 md:rounded-full md:py-2 ${
                    hovered === id ? 'border-cyan/60 text-white' : 'text-slate-100 hover:border-cyan/60'
                  }`}
                >
                  <span className="font-display text-lg text-cyan md:text-sm">{i + 1}</span>
                  <span className="text-sm leading-snug font-medium">{COPY[id].name}</span>
                  {done && (
                    <span className="text-cyan" aria-label={t.visited}>
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
