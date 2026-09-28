import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { guessInitialTier, stepTier } from '../lib/quality';
import { useSettings } from '../state/settings';

function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext): string | null {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  } catch {
    return null;
  }
}

/**
 * Adaptive quality: an initial guess from device/GPU hints, then frame-timing feedback
 * (drei PerformanceMonitor) steps the automatic tier up or down. A manual tier set in
 * Settings overrides all of this.
 */
export function QualityGovernor() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    useSettings.getState().setAutoTier(guessInitialTier(rendererName(gl.getContext())));
  }, [gl]);

  return (
    <PerformanceMonitor
      flipflops={4}
      onDecline={() => {
        const s = useSettings.getState();
        s.setAutoTier(stepTier(s.autoTier, -1));
      }}
      onIncline={() => {
        const s = useSettings.getState();
        s.setAutoTier(stepTier(s.autoTier, 1));
      }}
      onFallback={() => useSettings.getState().setAutoTier('low')}
    />
  );
}
