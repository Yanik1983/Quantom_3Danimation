import { useEffect, useId, useRef, useState } from 'react';
import { useUi } from '../content/i18n';
import { useSettings, type MotionPref, type TierPref } from '../state/settings';

interface RadioOption<T extends string> {
  value: T;
  label: string;
}

function RadioRow<T extends string>(props: {
  legend: string;
  value: T;
  options: RadioOption<T>[];
  onChange(v: T): void;
}) {
  const name = useId();
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase rtl:tracking-normal">
        {props.legend}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {props.options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan ${
              props.value === o.value
                ? 'border-cyan/60 bg-cyan/15 text-cyan'
                : 'border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={o.value}
              checked={props.value === o.value}
              onChange={() => props.onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const s = useSettings();
  const t = useUi();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const tierOptions: RadioOption<TierPref>[] = [
    { value: 'auto', label: t.auto(t.tier[s.autoTier]) },
    { value: 'low', label: t.tier.low },
    { value: 'medium', label: t.tier.medium },
    { value: 'high', label: t.tier.high },
  ];
  const motionOptions: RadioOption<MotionPref>[] = [
    { value: 'system', label: t.system(s.systemReducedMotion) },
    { value: 'reduce', label: t.reduced },
    { value: 'full', label: t.full },
  ];

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="glass flex size-10 items-center justify-center rounded-full text-slate-200 hover:text-white"
      >
        <span className="sr-only">{t.settings}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t.settings}
          className="glass absolute top-12 end-0 w-80 max-w-[calc(100vw-2rem)] space-y-5 rounded-2xl p-5"
        >
          <RadioRow
            legend={t.visualQuality}
            value={s.tierPref}
            options={tierOptions}
            onChange={s.setTierPref}
          />
          <RadioRow
            legend={t.motion}
            value={s.motionPref}
            options={motionOptions}
            onChange={s.setMotionPref}
          />
          <div className="space-y-1.5">
            <RadioRow
              legend={t.labHum}
              value={s.ambient ? 'on' : 'off'}
              options={[
                { value: 'off', label: t.off },
                { value: 'on', label: t.on },
              ]}
              onChange={(v) => s.setAmbient(v === 'on')}
            />
            <p className="text-xs leading-relaxed text-slate-400">{t.labHumNote}</p>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">{t.settingsNote}</p>
        </div>
      )}
    </div>
  );
}
