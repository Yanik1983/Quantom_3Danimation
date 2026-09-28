import { useEffect, useRef, type KeyboardEvent } from 'react';
import { SECTIONS } from '../content/sections';
import { jumpToStation } from '../lib/scroll';
import { useNav } from '../state/nav';

/** Persistent 8-step progress rail. Click or use arrow keys to travel. */
export function ProgressRail() {
  const active = useNav((s) => s.active);
  const fill = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // Transient subscription: the fill tracks scroll without re-rendering React.
  useEffect(
    () =>
      useNav.subscribe((s) => {
        const t = Math.max(0, Math.min(1, (s.p - 1) / (SECTIONS.length - 1)));
        if (fill.current) fill.current.style.setProperty('--rail-fill', String(t));
      }),
    [],
  );

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = SECTIONS.length - 1;
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = Math.min(last, i + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = Math.max(0, i - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next >= 0) {
      e.preventDefault();
      buttons.current[next]?.focus();
      jumpToStation(SECTIONS[next].station);
    }
  }

  return (
    <nav
      aria-label="Sections"
      className="fixed z-30 max-md:top-14 max-md:left-1/2 max-md:-translate-x-1/2 md:top-1/2 md:right-4 md:-translate-y-1/2"
    >
      <div
        ref={fill}
        aria-hidden="true"
        className="rail-track absolute max-md:inset-x-3 max-md:top-1/2 max-md:h-px md:inset-y-3 md:right-[0.6875rem] md:w-px"
      />
      <ol className="relative flex gap-1 max-md:flex-row md:flex-col md:gap-2">
        {SECTIONS.map((s, i) => {
          const current = active === s.station;
          return (
            <li key={s.id} className="flex md:justify-end">
              <button
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                aria-label={`${i + 1}. ${s.railLabel}`}
                aria-current={current ? 'step' : undefined}
                onClick={() => jumpToStation(s.station)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className="group flex items-center gap-3 rounded-full p-1.5 focus-visible:outline-2 focus-visible:outline-cyan"
              >
                <span
                  className={`pointer-events-none hidden text-xs whitespace-nowrap transition-opacity md:inline ${
                    current
                      ? 'text-white opacity-100'
                      : 'text-slate-300 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                  }`}
                >
                  {s.railLabel}
                </span>
                <span
                  aria-hidden="true"
                  className={`block size-2.5 rounded-full border transition-all ${
                    current
                      ? 'scale-125 border-cyan bg-cyan shadow-[0_0_12px_#22e4ff]'
                      : active > s.station
                        ? 'border-violet bg-violet/70'
                        : 'border-white/40 bg-transparent group-hover:border-white'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
