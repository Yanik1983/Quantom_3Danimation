import { jumpToStation } from '../lib/scroll';
import { SettingsMenu } from './SettingsMenu';

export function Header() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 md:px-8">
      <button
        type="button"
        onClick={() => jumpToStation(0)}
        className="pointer-events-auto flex items-center gap-2 rounded-full font-display text-sm font-semibold tracking-wide text-white"
      >
        <img src="/favicon.svg" alt="" className="size-7" />
        Quantum, up close
      </button>
      <div className="pointer-events-auto">
        <SettingsMenu />
      </div>
    </header>
  );
}
