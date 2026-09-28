import { useEffect } from 'react';
import { initLabHistory } from './state/lab';
import { selectReducedMotion, useSettings, useTierParams } from './state/settings';
import { CanvasRoot } from './three/CanvasRoot';
import { DebugOverlay } from './ui/DebugOverlay';
import { ExperimentCard } from './ui/ExperimentCard';
import { Header } from './ui/Header';
import { LabOverlay } from './ui/LabOverlay';

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
  useEffect(() => initLabHistory(), []);

  return (
    <>
      <CanvasRoot />
      <Header />
      <main>
        <LabOverlay />
        <ExperimentCard />
      </main>
      {debug && <DebugOverlay />}
    </>
  );
}
