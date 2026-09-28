import type { ExperimentCopy } from '../content/experiments';
import { Equation } from './Equation';
import { RichText } from './RichText';

/** Closed by default: the equations and the "how it's simulated" notes. */
export function LearnMore({ copy }: { copy: ExperimentCopy['learnMore'] }) {
  return (
    <details className="group rounded-xl border border-white/10 bg-white/[0.02]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium text-violet-ink select-none [&::-webkit-details-marker]:hidden">
        Learn more
        <span aria-hidden="true" className="transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-slate-300">
        {copy.equations.map((tex) => (
          <Equation
            key={tex}
            tex={tex}
            display
            className="overflow-x-auto overflow-y-hidden text-slate-100"
          />
        ))}
        {copy.paragraphs.map((p, i) => (
          <p key={i}>
            <RichText text={p} />
          </p>
        ))}
      </div>
    </details>
  );
}
