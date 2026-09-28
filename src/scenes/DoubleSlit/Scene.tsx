import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDisposable } from '../../hooks/useDisposable';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  Color,
  Data3DTexture,
  DynamicDrawUsage,
  EdgesGeometry,
  HalfFloatType,
  LinearFilter,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RGFormat,
  ShaderMaterial,
  Sphere,
  TorusGeometry,
  Vector3,
} from 'three';
import { DEFAULT_DOUBLE_SLIT } from '../../physics/doubleSlit';
import { useTier, useTierParams } from '../../state/settings';
import { glsl } from '../../three/shaders';
import waveVert from '../../three/shaders/doubleSlit/wave.vert.glsl?raw';
import waveFrag from '../../three/shaders/doubleSlit/wave.frag.glsl?raw';
import hitsVert from '../../three/shaders/doubleSlit/hits.vert.glsl?raw';
import hitsFrag from '../../three/shaders/doubleSlit/hits.frag.glsl?raw';
import type { SceneProps } from '../registry';
import { loadDoubleSlit, type DoubleSlitData } from './data';
import { BRANCH_COHERENT, DoubleSlitEngine, MAX_PACKETS } from './engine';
import {
  HIST_BINS,
  PLANE_DEPTH,
  PLANE_WIDTH,
  REGION,
  S,
  SCREEN_HEIGHT,
  simXToS,
  simXToZ,
  simYToX,
  TEX_H,
  TEX_W,
} from './geometry';
import { fireRate, IDLE_RATE, useDoubleSlit } from './store';
import { ZoomLens } from './ZoomLens';

const cfg = DEFAULT_DOUBLE_SLIT;
const MASK_Z = simXToZ(cfg.maskX);
const SCREEN_Z = simXToZ(cfg.screenX);
const SLIT_X = simYToX(cfg.slitSeparation / 2);
const SLIT_HALF = (cfg.slitWidth * S) / 2;
const MASK_HEIGHT = 0.6;
const HIT_ATTRIBUTES: readonly (readonly [string, number])[] = [
  ['position', 3],
  ['aBirth', 1],
  ['aBranch', 1],
];
/** Seconds to play back one particle's full simulated journey. */
const CYCLE = 3.2;
/** The apparatus is built in simulation-derived units; this shrinks it onto its lab table. */
const TABLE_SCALE = 0.38;

function Mask() {
  const segments = useDisposable(() => {
    const w = PLANE_WIDTH / 2;
    const spans: [number, number][] = [
      [-w, -SLIT_X - SLIT_HALF],
      [-SLIT_X + SLIT_HALF, SLIT_X - SLIT_HALF],
      [SLIT_X + SLIT_HALF, w],
    ];
    const items = spans.map(([a, b]) => {
      const box = new BoxGeometry(b - a, MASK_HEIGHT, cfg.maskThickness * S);
      return { x: (a + b) / 2, box, edges: new EdgesGeometry(box) };
    });
    return {
      items,
      dispose: () => items.forEach((i) => (i.box.dispose(), i.edges.dispose())),
    };
  }, []);
  const body = useDisposable(() => new MeshBasicMaterial({ color: new Color('#0a0d1a') }), []);
  const rim = useDisposable(
    () => new LineBasicMaterial({ color: new Color('#22e4ff'), transparent: true, opacity: 0.55 }),
    [],
  );
  return (
    <group position={[0, MASK_HEIGHT / 2, MASK_Z]}>
      {segments.items.map((s, i) => (
        <group key={i} position={[s.x, 0, 0]}>
          <mesh geometry={s.box} material={body} />
          <lineSegments geometry={s.edges} material={rim} />
        </group>
      ))}
    </group>
  );
}

function ScreenPanel() {
  const panel = useDisposable(() => new PlaneGeometry(PLANE_WIDTH, SCREEN_HEIGHT), []);
  const frame = useDisposable(() => new EdgesGeometry(panel), [panel]);
  const mat = useDisposable(() => new MeshBasicMaterial({ color: new Color('#070912') }), []);
  const rim = useDisposable(
    () => new LineBasicMaterial({ color: new Color('#8b5cf6'), transparent: true, opacity: 0.6 }),
    [],
  );
  return (
    <group position={[0, SCREEN_HEIGHT / 2, SCREEN_Z - 0.03]}>
      <mesh geometry={panel} material={mat} />
      <lineSegments geometry={frame} material={rim} />
    </group>
  );
}

function Emitter() {
  const body = useDisposable(() => new BoxGeometry(0.7, 0.3, 0.4), []);
  const ring = useDisposable(() => new TorusGeometry(0.13, 0.03, 12, 48), []);
  const dark = useDisposable(() => new MeshBasicMaterial({ color: new Color('#0c1022') }), []);
  const glow = useDisposable(() => new MeshBasicMaterial({ color: new Color(0.4, 2.2, 2.8) }), []);
  const z = simXToZ(REGION.x0) + 0.1;
  return (
    <group position={[0, 0.16, z]}>
      <mesh geometry={body} material={dark} />
      <mesh geometry={ring} material={glow} position={[0, 0, -0.21]} />
    </group>
  );
}

function Experiment({ data, active }: { data: DoubleSlitData; active: boolean }) {
  const tier = useTier();
  const { particleScale } = useTierParams();
  const dpr = useThree((s) => s.viewport.dpr);
  const capacity = Math.round(30000 * particleScale);

  const volume = useDisposable(() => {
    const t = new Data3DTexture(data.volume, TEX_W, TEX_H, data.frames);
    t.format = RGFormat;
    t.type = HalfFloatType;
    t.minFilter = t.magFilter = LinearFilter;
    t.wrapS = t.wrapT = t.wrapR = ClampToEdgeWrapping;
    t.unpackAlignment = 1;
    t.needsUpdate = true;
    return t;
  }, [data]);

  const engine = useMemo(
    () =>
      new DoubleSlitEngine({
        coherent: data.coherent,
        upper: data.upper,
        y0: data.grid.y0,
        dy: data.grid.dy,
        halfWidth: REGION.y1,
        capacity,
        cycle: CYCLE,
        arrival: data.arrivalFraction,
        atMask: data.maskFraction,
        hitX: simYToX,
        screenZ: SCREEN_Z,
        screenHeight: SCREEN_HEIGHT,
        histBins: HIST_BINS,
        visiblePackets: tier === 'low' ? 2 : MAX_PACKETS,
      }),
    [data, capacity, tier],
  );

  const segW = tier === 'low' ? 90 : tier === 'medium' ? 150 : 200;
  const segD = tier === 'low' ? 110 : tier === 'medium' ? 180 : 240;
  const waveGeo = useDisposable(() => new PlaneGeometry(PLANE_WIDTH, PLANE_DEPTH, segW, segD), [segW, segD]);
  const waveMat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: glsl(waveVert),
        fragmentShader: glsl(waveFrag),
        uniforms: {
          uFrames: { value: volume },
          uT: { value: [0, 0, 0, 0] },
          uW: { value: [0, 0, 0, 0] },
          uBranch: { value: [0, 0, 0, 0] },
          uMaskS: { value: simXToS(cfg.maskX) },
          uHeight: { value: tier === 'low' ? 0.12 : 0.28 },
        },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [volume, tier],
  );

  const hitsGeo = useDisposable(() => {
    const g = new BufferGeometry();
    const pos = new BufferAttribute(engine.positions, 3).setUsage(DynamicDrawUsage);
    const birth = new BufferAttribute(engine.births, 1).setUsage(DynamicDrawUsage);
    const branch = new BufferAttribute(engine.branches, 1).setUsage(DynamicDrawUsage);
    g.setAttribute('position', pos);
    g.setAttribute('aBirth', birth);
    g.setAttribute('aBranch', branch);
    g.setDrawRange(0, 0);
    // Hits only ever land on the screen panel; bound them there so culling works.
    g.boundingSphere = new Sphere(new Vector3(0, SCREEN_HEIGHT / 2, SCREEN_Z), PLANE_WIDTH);
    return g;
  }, [engine]);
  const hitsMat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: hitsVert,
        fragmentShader: hitsFrag,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: tier === 'low' ? 1.1 : 0.85 },
          uPixelRatio: { value: 1 },
        },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [tier],
  );

  const ringGeo = useDisposable(() => new TorusGeometry(0.2, 0.03, 12, 48), []);
  const ringUpper = useDisposable(
    () => new MeshBasicMaterial({ color: new Color('#ff3dbb'), transparent: true }),
    [],
  );
  const ringLower = useDisposable(
    () => new MeshBasicMaterial({ color: new Color('#ff3dbb'), transparent: true }),
    [],
  );
  const upperRef = useRef<Mesh>(null);
  const lowerRef = useRef<Mesh>(null);

  const clock = useRef({
    now: 0,
    lastSync: 0,
    firingSince: -1,
    clearToken: useDoubleSlit.getState().clearToken,
    ringFade: 0,
  });

  useFrame((_, rawDt) => {
    const c = clock.current;
    const dt = Math.min(rawDt, 0.1);
    c.now += dt;
    const st = useDoubleSlit.getState();
    if (st.clearToken !== c.clearToken) {
      c.clearToken = st.clearToken;
      engine.clear();
      hitsGeo.setDrawRange(0, 0);
    }

    // Idle on the lab table: a slow, steady stream. Open: fire only on request, speeding up.
    let rate = IDLE_RATE;
    if (active) {
      if (st.firing && c.firingSince < 0) c.firingSince = c.now;
      if (!st.firing) c.firingSince = -1;
      rate = st.firing ? fireRate(c.now - c.firingSince) : 0;
    }
    engine.update(c.now, dt, rate, active ? st.measuring : false, rate > 0);

    // Upload only the hits written this frame (the span may wrap around the ring).
    if (engine.dirtyCount > 0) {
      const first = Math.min(engine.dirtyCount, capacity - engine.dirtyStart);
      const rest = engine.dirtyCount - first;
      for (let a = 0; a < HIT_ATTRIBUTES.length; a++) {
        const size = HIT_ATTRIBUTES[a][1];
        const attr = hitsGeo.attributes[HIT_ATTRIBUTES[a][0]] as BufferAttribute;
        attr.clearUpdateRanges();
        attr.addUpdateRange(engine.dirtyStart * size, first * size);
        if (rest > 0) attr.addUpdateRange(0, rest * size);
        attr.needsUpdate = true;
      }
      hitsGeo.setDrawRange(0, engine.stored);
    }
    hitsMat.uniforms.uTime.value = c.now;
    hitsMat.uniforms.uPixelRatio.value = dpr;

    const u = waveMat.uniforms;
    const T = u.uT.value as number[];
    const W = u.uW.value as number[];
    const B = u.uBranch.value as number[];
    for (let i = 0; i < MAX_PACKETS; i++) {
      const f = engine.packetTime(i, c.now);
      T[i] = (f * (data.frames - 1) + 0.5) / data.frames;
      W[i] = engine.packetWeight(i, c.now);
      B[i] = engine.packetStart[i] >= 0 ? engine.packetBranch[i] : BRANCH_COHERENT;
    }

    // Which-path detectors fade in/out with the toggle and flash on each registration.
    c.ringFade += ((active && st.measuring ? 1 : 0) - c.ringFade) * Math.min(1, dt * 6);
    ringUpper.opacity = c.ringFade;
    ringLower.opacity = c.ringFade;
    ringUpper.color.setRGB(1, 0.24, 0.73).multiplyScalar(0.5 + 2.5 * engine.flashUpper);
    ringLower.color.setRGB(1, 0.24, 0.73).multiplyScalar(0.5 + 2.5 * engine.flashLower);
    if (upperRef.current) upperRef.current.visible = c.ringFade > 0.01;
    if (lowerRef.current) lowerRef.current.visible = c.ringFade > 0.01;

    if (active && c.now - c.lastSync > 0.25 && st.detected !== engine.detected) {
      c.lastSync = c.now;
      useDoubleSlit.setState({ detected: engine.detected });
    }
  });

  return (
    <>
      <mesh geometry={waveGeo} material={waveMat} rotation={[-Math.PI / 2, 0, 0]} />
      <points geometry={hitsGeo} material={hitsMat} />
      <mesh ref={upperRef} geometry={ringGeo} material={ringUpper} position={[SLIT_X, 0.3, MASK_Z + 0.2]} />
      <mesh ref={lowerRef} geometry={ringGeo} material={ringLower} position={[-SLIT_X, 0.3, MASK_Z + 0.2]} />
    </>
  );
}

export default function DoubleSlitScene({ active }: SceneProps) {
  const tier = useTier();
  const quality = tier === 'low' ? 'low' : 'high';
  const [data, setData] = useState<DoubleSlitData | null>(null);
  // Opening the experiment starts from a clean screen with the source off.
  useEffect(() => {
    if (active) useDoubleSlit.getState().reset();
  }, [active]);
  useEffect(() => {
    let alive = true;
    loadDoubleSlit(quality).then(
      (d) => alive && setData(d),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [quality]);

  return (
    <group>
      <group scale={TABLE_SCALE} position={[0.35, 0.02, 0]}>
        <Mask />
        <ScreenPanel />
        <Emitter />
        {data && <Experiment data={data} active={active} />}
      </group>
      <group position={[-1.55, 2.45, -1.3]} rotation={[-0.3, 0.2, 0]} scale={0.62}>
        <ZoomLens />
      </group>
    </group>
  );
}
