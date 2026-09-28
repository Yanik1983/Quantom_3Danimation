import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  ClampToEdgeWrapping,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  Group,
  HalfFloatType,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  Plane,
  PlaneGeometry,
  RGFormat,
  RingGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { useTier } from '../../state/settings';
import { glsl } from '../../three/shaders';
import surfaceVert from '../../three/shaders/wavefunction/surface.vert.glsl?raw';
import surfaceFrag from '../../three/shaders/wavefunction/surface.frag.glsl?raw';
import densityVert from '../../three/shaders/wavefunction/density.vert.glsl?raw';
import densityFrag from '../../three/shaders/wavefunction/density.frag.glsl?raw';
import type { WavefunctionRequest, WavefunctionTick } from '../../workers/wavefunctionProtocol';
import type { SceneProps } from '../registry';
import { MAX_PACKETS, useWavefunction } from './store';

/** Simulation grid: N × N points over a SIZE × SIZE box (ℏ = m = 1). */
export const N = 128;
export const SIZE = 20;
export const OMEGA = 0.5;
const DT = 0.01;
const STEPS_PER_TICK = 3;
/** World units per simulation unit. */
const S = 0.4;
const WORLD = SIZE * S;
const FLOOR_Y = -2.6;
const HEIGHT = 6.5;
/** Reference amplitude/density: a single σ = 1 packet's peak. */
const AMP_REF = 1 / Math.sqrt(2 * Math.PI);
const ARROW_SCALE = 0.32;

const simToWorld = (x: number, y: number, out: Vector3) => out.set(x * S, FLOOR_Y + 0.01, -y * S);

function useWavefunctionWorker(texData: Uint16Array, onTick: (m: WavefunctionTick) => void) {
  const state = useRef({ worker: null as Worker | null, inFlight: false, spare: null as Uint16Array | null });
  useEffect(() => {
    const worker = new Worker(new URL('../../workers/wavefunction.worker.ts', import.meta.url), {
      type: 'module',
    });
    const init: WavefunctionRequest = { type: 'init', n: N, size: SIZE, dt: DT, omega: OMEGA };
    worker.postMessage(init);
    const s = state.current;
    s.worker = worker;
    s.spare = new Uint16Array(texData.length);
    worker.onmessage = (e: MessageEvent<WavefunctionTick>) => {
      s.inFlight = false;
      texData.set(e.data.tex);
      s.spare = e.data.tex;
      onTick(e.data);
    };
    return () => {
      worker.terminate();
      s.worker = null;
      s.inFlight = false;
    };
  }, [texData, onTick]);
  return state;
}

export default function WavefunctionScene({ active }: SceneProps) {
  const tier = useTier();
  const seg = tier === 'low' ? 72 : N - 1;

  const texData = useMemo(() => new Uint16Array(N * N * 2), []);
  const texture = useDisposable(() => {
    const t = new DataTexture(texData, N, N, RGFormat, HalfFloatType);
    t.minFilter = t.magFilter = LinearFilter;
    t.wrapS = t.wrapT = ClampToEdgeWrapping;
    t.needsUpdate = true;
    return t;
  }, [texData]);

  const surfaceGeo = useDisposable(() => new PlaneGeometry(WORLD, WORLD, seg, seg), [seg]);
  const surfaceMat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: surfaceVert,
        fragmentShader: glsl(surfaceFrag),
        uniforms: {
          uPsi: { value: texture },
          uHeight: { value: HEIGHT * S },
          uTexel: { value: [1 / N, 1 / N] },
          uSize: { value: WORLD },
          uAmpRef: { value: AMP_REF },
        },
        transparent: true,
        depthWrite: false,
      }),
    [texture],
  );
  const floorGeo = useDisposable(() => new PlaneGeometry(WORLD, WORLD), []);
  const floorMat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: densityVert,
        fragmentShader: densityFrag,
        uniforms: { uPsi: { value: texture }, uRhoRef: { value: AMP_REF * AMP_REF } },
      }),
    [texture],
  );

  // Rebuild/evolve protocol: at most one tick in flight; edits are folded into the next one.
  const sync = useRef({ version: -1, lastMeasure: 0 });
  const onTick = useMemo(
    () => (m: WavefunctionTick) => {
      texture.needsUpdate = true;
      if (m.obs) useWavefunction.setState({ obs: m.obs, time: m.t });
    },
    [texture],
  );
  const worker = useWavefunctionWorker(texData, onTick);

  useFrame((state) => {
    const w = worker.current;
    if (!w.worker || w.inFlight || !w.spare) return;
    const st = useWavefunction.getState();
    const edited = st.version !== sync.current.version;
    const evolving = st.evolving && active;
    if (!edited && !evolving) return;
    const now = state.clock.elapsedTime;
    const measure = edited || now - sync.current.lastMeasure > 0.2;
    if (measure) sync.current.lastMeasure = now;
    sync.current.version = st.version;
    const tex = w.spare;
    w.spare = null;
    w.inFlight = true;
    const req: WavefunctionRequest = {
      type: 'tick',
      tex,
      steps: evolving && !edited ? STEPS_PER_TICK : 0,
      packets: edited ? st.packets : undefined,
      potential: st.potential,
      measure,
    };
    w.worker.postMessage(req, [tex.buffer]);
  });

  return (
    <group>
      <mesh geometry={surfaceGeo} material={surfaceMat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} />
      <mesh
        geometry={floorGeo}
        material={floorMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y, 0]}
      />
      <Handles />
    </group>
  );
}

const floorPlane = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();

/** Draggable rings (position) and arrow tips (momentum) for each packet, on the floor. */
function Handles() {
  const count = useWavefunction((s) => s.packets.length);
  const ringGeo = useDisposable(() => new RingGeometry(0.4, 0.44, 64), []);
  const hitGeo = useDisposable(() => new RingGeometry(0, 0.55, 24), []);
  const shaftGeo = useDisposable(() => new CylinderGeometry(0.03, 0.03, 1, 8), []);
  const tipGeo = useDisposable(() => new ConeGeometry(0.12, 0.3, 16), []);
  const tipHitGeo = useDisposable(() => new ConeGeometry(0.3, 0.6, 8), []);
  const mats = useDisposable(() => {
    const ring = new MeshBasicMaterial({
      color: new Color(0.9, 1.6, 2),
      transparent: true,
      blending: AdditiveBlending,
    });
    const ringSel = new MeshBasicMaterial({
      color: new Color(2, 0.5, 1.5),
      transparent: true,
      blending: AdditiveBlending,
    });
    const arrow = new MeshBasicMaterial({ color: new Color(0.8, 0.6, 1.4) });
    const invisible = new MeshBasicMaterial({ visible: false });
    return {
      ring,
      ringSel,
      arrow,
      invisible,
      dispose: () => [ring, ringSel, arrow, invisible].forEach((m) => m.dispose()),
    };
  }, []);
  const shared = { ringGeo, hitGeo, shaftGeo, tipGeo, tipHitGeo, mats };
  return (
    <>
      {Array.from({ length: Math.min(count, MAX_PACKETS) }, (_, i) => (
        <Handle key={i} index={i} {...shared} />
      ))}
    </>
  );
}

interface HandleProps {
  index: number;
  ringGeo: RingGeometry;
  hitGeo: RingGeometry;
  shaftGeo: CylinderGeometry;
  tipGeo: ConeGeometry;
  tipHitGeo: ConeGeometry;
  mats: {
    ring: MeshBasicMaterial;
    ringSel: MeshBasicMaterial;
    arrow: MeshBasicMaterial;
    invisible: MeshBasicMaterial;
  };
}

function Handle({ index, ringGeo, hitGeo, shaftGeo, tipGeo, tipHitGeo, mats }: HandleProps) {
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const arrow = useRef<Group>(null);
  const shaft = useRef<Mesh>(null);
  const drag = useRef<'move' | 'push' | null>(null);
  const tmp = useMemo(() => new Vector3(), []);

  // Follow the store without re-rendering React on every drag frame.
  useFrame(() => {
    const st = useWavefunction.getState();
    const p = st.packets[index];
    if (!p || !group.current || !arrow.current || !shaft.current || !ring.current) return;
    simToWorld(p.x, p.y, tmp);
    group.current.position.copy(tmp);
    const len = Math.hypot(p.kx, p.ky) * ARROW_SCALE;
    arrow.current.visible = len > 0.05;
    arrow.current.rotation.set(0, Math.atan2(p.ky, p.kx), 0);
    shaft.current.scale.set(1, Math.max(len - 0.25, 0.001), 1);
    shaft.current.position.set(Math.max(len - 0.25, 0) / 2, 0, 0);
    arrow.current.children[1]?.position.set(len - 0.15, 0, 0);
    arrow.current.children[2]?.position.set(len - 0.15, 0, 0);
    ring.current.material = st.selected === index ? mats.ringSel : mats.ring;
  });

  const toSim = (e: ThreeEvent<PointerEvent>) => {
    const parent = group.current?.parent;
    if (!parent) return null;
    floorPlane.constant = -parent.localToWorld(tmp.set(0, FLOOR_Y, 0)).y;
    if (!e.ray.intersectPlane(floorPlane, hit)) return null;
    parent.worldToLocal(hit);
    return { x: hit.x / S, y: -hit.z / S };
  };

  const onDown = (kind: 'move' | 'push') => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = kind;
    useWavefunction.getState().select(index);
    document.body.style.cursor = 'grabbing';
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    const q = toSim(e);
    if (!q) return;
    const st = useWavefunction.getState();
    const p = st.packets[index];
    const lim = SIZE / 2 - 3.5;
    if (drag.current === 'move') {
      st.setPacket(index, { x: clamp(q.x, -lim, lim), y: clamp(q.y, -lim, lim) });
    } else {
      // Arrow length ∝ |k|; the tip marks p = ℏk.
      const kx = (q.x - p.x) * (S / ARROW_SCALE);
      const ky = (q.y - p.y) * (S / ARROW_SCALE);
      const k = Math.hypot(kx, ky);
      const f = k > K_MAX ? K_MAX / k : 1;
      st.setPacket(index, { kx: round2(kx * f), ky: round2(ky * f) });
    }
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    drag.current = null;
    document.body.style.cursor = '';
  };
  const hover = (on: boolean) => () => {
    if (!drag.current) document.body.style.cursor = on ? 'grab' : '';
  };

  return (
    <group ref={group}>
      <mesh ref={ring} geometry={ringGeo} material={mats.ring} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh
        geometry={hitGeo}
        material={mats.invisible}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={onDown('move')}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerOver={hover(true)}
        onPointerOut={hover(false)}
      />
      <group ref={arrow}>
        <mesh ref={shaft} geometry={shaftGeo} material={mats.arrow} rotation={[0, 0, Math.PI / 2]} />
        <mesh geometry={tipGeo} material={mats.arrow} rotation={[0, 0, -Math.PI / 2]} />
        <mesh
          geometry={tipHitGeo}
          material={mats.invisible}
          rotation={[0, 0, -Math.PI / 2]}
          onPointerDown={onDown('push')}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerOver={hover(true)}
          onPointerOut={hover(false)}
        />
      </group>
    </group>
  );
}

export const K_MAX = 5;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round2 = (v: number) => Math.round(v * 100) / 100;
