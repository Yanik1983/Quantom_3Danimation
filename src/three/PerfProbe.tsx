import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { selectTier, useSettings } from '../state/settings';

export interface PerfSample {
  fps: number;
  frameMs: number;
  worstMs: number;
  calls: number;
  triangles: number;
  points: number;
  tier: string;
  dpr: number;
}

declare global {
  interface Window {
    __quantumPerf?: PerfSample;
  }
}

const WINDOW = 0.5;

/**
 * Publishes frame statistics on window.__quantumPerf (read by the debug overlay and the
 * e2e smoke test). Accumulates into plain numbers — no allocation per frame.
 */
export function PerfProbe() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);

  const acc = useMemo(() => ({ t: 0, frames: 0, worst: 0 }), []);
  const sample = useMemo<PerfSample>(
    () => ({ fps: 0, frameMs: 0, worstMs: 0, calls: 0, triangles: 0, points: 0, tier: '', dpr: 1 }),
    [],
  );

  useFrame((state, dt) => {
    acc.t += dt;
    acc.frames++;
    if (dt > acc.worst) acc.worst = dt;
    // gl.info holds totals from the previous frame (all composer passes).
    sample.calls = gl.info.render.calls;
    sample.triangles = gl.info.render.triangles;
    sample.points = gl.info.render.points;
    gl.info.reset();
    if (acc.t >= WINDOW) {
      sample.fps = acc.frames / acc.t;
      sample.frameMs = (acc.t / acc.frames) * 1000;
      sample.worstMs = acc.worst * 1000;
      sample.tier = selectTier(useSettings.getState());
      sample.dpr = state.viewport.dpr;
      window.__quantumPerf = sample;
      acc.t = 0;
      acc.frames = 0;
      acc.worst = 0;
    }
  }, -1);

  return null;
}
