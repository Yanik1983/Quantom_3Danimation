import { useId, type ReactNode } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange(v: number): void;
  /** Human-readable value shown next to the label and announced to screen readers. */
  format?(v: number): string;
  hint?: string;
}

export function Slider({ label, value, min, max, step, onChange, format, hint }: SliderProps) {
  const id = useId();
  const text = format ? format(value) : String(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <label htmlFor={id} className="text-slate-200">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-xs text-cyan tabular-nums">
          {text}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={text}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        className="range w-full"
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange(v: boolean): void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm text-slate-200">
          {label}
        </label>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked ? 'border-magenta/60 bg-magenta/30' : 'border-white/15 bg-white/5'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 left-0.5 size-4.5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'ghost',
  label,
  disabled,
}: {
  children: ReactNode;
  onClick(): void;
  variant?: 'primary' | 'ghost';
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${
        variant === 'primary'
          ? 'bg-gradient-to-r from-cyan/80 to-violet/80 text-void hover:brightness-110'
          : 'border border-white/15 text-slate-200 hover:border-white/40 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange(v: T): void;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <p id={id} className="text-sm text-slate-200">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              value === o.value
                ? 'border-cyan/60 bg-cyan/15 text-cyan'
                : 'border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Screen-reader-only live description of what the visualization currently shows. */
export function LiveDescription({ children }: { children: ReactNode }) {
  return (
    <p className="sr-only" aria-live="polite">
      {children}
    </p>
  );
}

export function ControlPanel({ children, title = 'Controls' }: { children: ReactNode; title?: string }) {
  return (
    <div
      role="group"
      aria-label={title}
      className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"
    >
      {children}
    </div>
  );
}
