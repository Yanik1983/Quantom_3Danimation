import { useId } from 'react';
import { useSettings, type ExplainMode } from '../state/settings';

const OPTIONS: { value: ExplainMode; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'technical', label: 'Technical' },
];

/** "Explain this" switch — global, so every section follows the reader's choice. */
export function ExplainToggle() {
  const explain = useSettings((s) => s.explain);
  const setExplain = useSettings((s) => s.setExplain);
  const id = useId();
  return (
    <div className="flex items-center gap-2 text-xs">
      <span id={id} className="text-slate-400">
        Explain this
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="flex rounded-full border border-white/10 bg-white/5 p-0.5"
      >
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={explain === o.value}
            onClick={() => setExplain(o.value)}
            className={`rounded-full px-3 py-1 transition-colors ${
              explain === o.value ? 'bg-cyan/20 text-cyan' : 'text-slate-300 hover:text-white'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
