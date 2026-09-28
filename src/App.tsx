import { useEffect } from 'react';
import { SECTIONS } from './content/sections';
import { initScrollSync, jumpToStation } from './lib/scroll';
import { selectReducedMotion, useSettings, useTierParams } from './state/settings';
import { CanvasRoot } from './three/CanvasRoot';
import { DebugOverlay } from './ui/DebugOverlay';
import { Header } from './ui/Header';
import { Hero } from './ui/Hero';
import { ProgressRail } from './ui/ProgressRail';
import { Section } from './ui/Section';

const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

function useEnvironmentSync() {
  const { blur } = useTierParams();
  const reduced = useSettings(selectReducedMotion);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => useSettings.getState().setSystemReducedMotion(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.blur = blur ? 'on' : 'off';
    document.documentElement.dataset.motion = reduced ? 'reduce' : 'full';
  }, [blur, reduced]);
}

export function App() {
  useEnvironmentSync();

  useEffect(() => {
    const cleanup = initScrollSync();
    const id = location.hash.slice(1);
    const sec = SECTIONS.find((s) => s.id === id);
    if (sec) requestAnimationFrame(() => jumpToStation(sec.station, { instant: true }));
    return cleanup;
  }, []);

  return (
    <>
      <a
        href="#double-slit"
        className="sr-only z-50 rounded bg-cyan px-3 py-2 text-void focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to first section
      </a>
      <CanvasRoot />
      <Header />
      <ProgressRail />
      <main className="pointer-events-none relative z-10">
        <Hero />
        {SECTIONS.map((meta, i) => (
          <Section key={meta.id} meta={meta} index={i} />
        ))}
      </main>
      <footer className="relative z-10 px-4 pb-10 text-center text-xs text-slate-500 md:px-8">
        Simulations use real quantum mechanics: split-step Fourier Schrödinger solvers, hydrogen
        eigenfunctions and Born-rule sampling. See “Under the hood” in each section.
      </footer>
      {debug && <DebugOverlay />}
    </>
  );
}
