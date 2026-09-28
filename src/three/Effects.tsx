import { useFrame } from '@react-three/fiber';
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Vignette,
} from '@react-three/postprocessing';
import { useMemo, useRef, type ReactElement } from 'react';
import { HalfFloatType, UnsignedByteType, Vector2 } from 'three';
import type { DepthOfFieldEffect } from 'postprocessing';
import { useReducedMotion, useTier, useTierParams } from '../state/settings';
import { rig } from './rig';

/** Bloom, subtle chromatic aberration, vignette, and depth of field that blooms only during camera flights. */
export function Effects() {
  const tier = useTier();
  const params = useTierParams();
  const reduced = useReducedMotion();
  const dof = useRef<DepthOfFieldEffect>(null);
  const caOffset = useMemo(() => new Vector2(0.0006, 0.0008), []);

  useFrame(() => {
    const e = dof.current;
    if (!e) return;
    if (e.target !== rig.look) e.target = rig.look;
    // Focus transition: defocus the periphery while travelling, settle to crisp on arrival.
    const want = Math.min(4, rig.speed * 0.06);
    e.bokehScale += (want - e.bokehScale) * 0.08;
  });

  const effects: ReactElement[] = [
    <Bloom
      key="bloom"
      mipmapBlur
      levels={tier === 'low' ? 4 : 6}
      resolutionScale={tier === 'low' ? 0.5 : 1}
      intensity={0.95}
      luminanceThreshold={0.18}
      luminanceSmoothing={0.35}
      radius={0.72}
    />,
  ];
  if (params.depthOfField && !reduced) {
    effects.push(<DepthOfField key="dof" ref={dof} worldFocusRange={14} bokehScale={0} />);
  }
  if (params.chromatic && !reduced) {
    effects.push(<ChromaticAberration key="ca" offset={caOffset} radialModulation modulationOffset={0.4} />);
  }
  effects.push(<Vignette key="vig" offset={0.28} darkness={0.72} />);

  return (
    <EffectComposer
      key={`${tier}-${reduced}`}
      multisampling={tier === 'high' ? 4 : 0}
      enableNormalPass={false}
      frameBufferType={tier === 'low' ? UnsignedByteType : HalfFloatType}
      resolutionScale={tier === 'low' ? 0.75 : 1}
    >
      {effects}
    </EffectComposer>
  );
}
