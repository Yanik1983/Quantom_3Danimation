import { useEffect, useState } from 'react';
import type { PerfSample } from '../three/PerfProbe';

/** Visible with `?debug` in the URL. */
export function DebugOverlay() {
  const [s, setS] = useState<PerfSample | undefined>();
  useEffect(() => {
    const id = window.setInterval(() => setS(window.__quantumPerf && { ...window.__quantumPerf }), 500);
    return () => window.clearInterval(id);
  }, []);
  if (!s) return null;
  return (
    <div className="fixed bottom-2 left-2 z-50 rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-lime-300">
      {s.fps.toFixed(0)} fps · {s.frameMs.toFixed(1)} ms (worst {s.worstMs.toFixed(0)}) · {s.calls} calls ·{' '}
      {(s.triangles / 1000).toFixed(0)}k tris · {(s.points / 1000).toFixed(0)}k pts · {s.tier} @ {s.dpr}x
    </div>
  );
}
