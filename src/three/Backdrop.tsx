import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  HalfFloatType,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import { mulberry32 } from '../physics/rng';
import { useTier, useTierParams } from '../state/settings';
import { STATIONS } from './stations';
import starsVert from './shaders/stars.vert.glsl?raw';
import starsFrag from './shaders/stars.frag.glsl?raw';
import nebulaVert from './shaders/nebula.vert.glsl?raw';
import nebulaFrag from './shaders/nebula.frag.glsl?raw';
import bakeVert from './shaders/nebulaBake.vert.glsl?raw';
import skyFrag from './shaders/nebulaSky.frag.glsl?raw';

const STAR_COLORS: [number, number, number][] = [
  [0.85, 0.9, 1.0],
  [0.6, 0.9, 1.0],
  [0.75, 0.65, 1.0],
  [1.0, 0.75, 0.9],
];

function buildStars(count: number): BufferGeometry {
  const rng = mulberry32(20240607);
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const color = new Float32Array(count * 3);
  let n = 0;
  while (n < count) {
    const x = -250 + rng() * 1050;
    const y = -260 + rng() * 520;
    const z = -420 + rng() * 520;
    // Keep a clear bubble around every station so stars never sit inside a simulation.
    let clear = true;
    for (const s of STATIONS) {
      const dx = x - s.center[0];
      const dy = y - s.center[1];
      const dz = z - s.center[2];
      if (dx * dx + dy * dy + dz * dz < 40 * 40) {
        clear = false;
        break;
      }
    }
    if (!clear) continue;
    pos.set([x, y, z], n * 3);
    size[n] = 0.6 + Math.pow(rng(), 3) * 2.6;
    phase[n] = rng();
    const c = STAR_COLORS[Math.floor(rng() * STAR_COLORS.length)];
    const b = 0.35 + rng() * 0.65;
    color.set([c[0] * b, c[1] * b, c[2] * b], n * 3);
    n++;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aSize', new BufferAttribute(size, 1));
  g.setAttribute('aPhase', new BufferAttribute(phase, 1));
  g.setAttribute('aColor', new BufferAttribute(color, 3));
  return g;
}

function Starfield() {
  const { stars } = useTierParams();
  const dpr = useThree((s) => s.viewport.dpr);
  const geometry = useMemo(() => buildStars(stars), [stars]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starsVert,
        fragmentShader: starsFrag,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.uniforms.uPixelRatio.value = dpr;
  }, [dpr, material]);
  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt;
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

function bakeNebula(gl: WebGLRenderer, width: number): WebGLRenderTarget {
  const rt = new WebGLRenderTarget(width, width / 2, {
    type: HalfFloatType,
    generateMipmaps: false,
    depthBuffer: false,
  });
  const quad = new PlaneGeometry(2, 2);
  const mat = new ShaderMaterial({ vertexShader: bakeVert, fragmentShader: nebulaFrag, depthTest: false });
  const scene = new Scene();
  scene.add(new Mesh(quad, mat));
  const prev = gl.getRenderTarget();
  gl.setRenderTarget(rt);
  gl.render(scene, new OrthographicCamera(-1, 1, 1, -1, 0, 1));
  gl.setRenderTarget(prev);
  quad.dispose();
  mat.dispose();
  return rt;
}

function Nebula() {
  const tier = useTier();
  const gl = useThree((s) => s.gl);
  const ref = useRef<Mesh>(null);
  const target = useMemo(() => bakeNebula(gl, tier === 'low' ? 1024 : 2048), [gl, tier]);
  const geometry = useMemo(() => new SphereGeometry(1800, 48, 24), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: nebulaVert,
        fragmentShader: skyFrag,
        uniforms: { uMap: { value: target.texture } },
        side: BackSide,
        depthWrite: false,
      }),
    [target],
  );
  useEffect(() => () => target.dispose(), [target]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((state) => {
    // The sky is infinitely far away: keep it centred on the camera.
    ref.current?.position.copy(state.camera.position);
  });
  return <mesh ref={ref} geometry={geometry} material={material} renderOrder={-10} frustumCulled={false} />;
}

export function Backdrop() {
  return (
    <>
      <Nebula />
      <Starfield />
    </>
  );
}
