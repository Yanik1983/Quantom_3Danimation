import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { AdditiveBlending, DoubleSide, PlaneGeometry, ShaderMaterial } from 'three';
import { useReducedMotion, useTier } from '../state/settings';
import type { SceneProps } from '../scenes/registry';
import { glsl } from './shaders';
import vert from './shaders/ripples.vert.glsl?raw';
import frag from './shaders/ripples.frag.glsl?raw';

/** Opening visual: two coherent circular waves interfering — a preview of what's to come. */
export function IntroScene({ active }: SceneProps) {
  const tier = useTier();
  const reduced = useReducedMotion();
  const segs = tier === 'low' ? 110 : tier === 'medium' ? 180 : 260;
  const geometry = useMemo(() => new PlaneGeometry(20, 20, segs, segs), [segs]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: glsl(frag),
        uniforms: { uTime: { value: 0 }, uK: { value: 3.2 }, uSep: { value: 1.1 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, dt) => {
    if (!active) return;
    material.uniforms.uTime.value += dt * (reduced ? 0.35 : 1);
  });
  return <mesh geometry={geometry} material={material} rotation={[-1.05, 0, 0.35]} position={[0, -0.6, 0]} />;
}
