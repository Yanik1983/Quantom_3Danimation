import { useUi } from '../content/i18n';
import { useLab } from '../state/lab';
import { useSettings } from '../state/settings';
import { SettingsMenu } from './SettingsMenu';

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
        <SettingsMenu />
      </div>
    </header>
  );
}
