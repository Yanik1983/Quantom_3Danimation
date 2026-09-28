import type { SectionContent } from '../content/types';
import { Equation } from './Equation';
import { RichText } from './RichText';

export function UnderTheHood({ data }: { data: SectionContent['underTheHood'] }) {
  return (
    <details className="group rounded-xl border border-white/10 bg-black/20">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-200 hover:text-white">
        <span>Under the hood</span>
        <span aria-hidden="true" className="text-cyan transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="space-y-4 px-4 pb-4 text-sm leading-relaxed text-slate-300">
        {data.equations.map((eq) => (
          <figure key={eq.tex} className="space-y-1">
            <Equation
              tex={eq.tex}
              display
              className="overflow-x-auto overflow-y-hidden py-1 text-slate-100"
            />
            <figcaption className="text-xs text-slate-400">
              <RichText text={eq.caption} />
            </figcaption>
          </figure>
        ))}
        <div className="space-y-2 border-t border-white/10 pt-3">
          <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-cyan uppercase">
            Numerical method
          </p>
          {data.method.map((m, i) => (
            <p key={i}>
              <RichText text={m} />
            </p>
          ))}
        </div>
      </div>
    </details>
  );
}
