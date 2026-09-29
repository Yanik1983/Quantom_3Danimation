import { useUi } from '../content/i18n';
import { useLab } from '../state/lab';
import { useSettings } from '../state/settings';
import { SettingsMenu } from './SettingsMenu';

/** Sound effects on / off (remembered). */
function SoundButton() {
  const t = useUi();
  const on = useSettings((s) => s.sound);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={t.sound}
      onClick={() => useSettings.getState().setSound(!on)}
      className="glass flex size-10 items-center justify-center rounded-full text-slate-200 hover:text-white"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {on ? (
          <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11" />
        ) : (
          <path d="m16 9.5 5 5m0-5-5 5" />
        )}
      </svg>
    </button>
  );
}

export function Header() {
  const t = useUi();
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 md:px-6">
      <button
        type="button"
        onClick={() => useLab.getState().open(null)}
        className="pointer-events-auto flex items-center gap-2 rounded-full font-display text-sm font-semibold tracking-wide text-white rtl:tracking-normal"
      >
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-7" />
        {t.appName}
      </button>
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          lang={t.switchTo.lang}
          aria-label={t.switchTo.aria}
          onClick={() => useSettings.getState().setLang(t.switchTo.lang)}
          className="glass h-10 rounded-full px-4 text-sm font-medium text-slate-100 hover:text-white"
        >
          {t.switchTo.label}
        </button>
        <SoundButton />
        <SettingsMenu />
      </div>
    </header>
  );
}
