import { useEffect } from 'react';
import { initSound, sound } from './lib/sound';
import { initLabHistory, useLab } from './state/lab';
import { UI } from './content/i18n';
import { selectReducedMotion, useLang, useSettings, useTierParams } from './state/settings';
import { CanvasRoot } from './three/CanvasRoot';
import { ComputerCard } from './ui/ComputerCard';
import { DebugOverlay } from './ui/DebugOverlay';
import { ExperimentCard } from './ui/ExperimentCard';
import { FinaleCard } from './ui/FinaleCard';
import { Header } from './ui/Header';
import { LabOverlay } from './ui/LabOverlay';

const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

function useEnvironmentSync() {
  const { blur } = useTierParams();
  const reduced = useSettings(selectReducedMotion);
  const lang = useLang();
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
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = UI[lang].dir;
    document.title = UI[lang].documentTitle;
  }, [lang]);
}

/** Sound cues for moving around the lab: a whoosh as the camera glides, a fanfare for the finale. */
function useSoundCues() {
  useEffect(() => {
    const stop = initSound();
    const unsub = useLab.subscribe((s, prev) => {
      if (s.current === prev.current && s.panel === prev.panel) return;
      if (s.panel === 'finale') sound.fanfare();
      else sound.whoosh(0.07);
    });
    return () => {
      unsub();
      stop();
    };
  }, []);
}

export function App() {
  useEnvironmentSync();
  useSoundCues();
  useEffect(() => initLabHistory(), []);

  return (
    <>
      <CanvasRoot />
      <Header />
      <main>
        <LabOverlay />
        <ExperimentCard />
        <ComputerCard />
        <FinaleCard />
      </main>
      {debug && <DebugOverlay />}
    </>
  );
}
