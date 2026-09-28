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
  DataTexture,
  DynamicDrawUsage,
  EdgesGeometry,
  FloatType,
  HalfFloatType,
  LinearFilter,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
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
import histVert from '../../three/shaders/doubleSlit/hist.vert.glsl?raw';
import histFrag from '../../three/shaders/doubleSlit/hist.frag.glsl?raw';
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
import { useDoubleSlit } from './store';

const cfg = DEFAULT_DOUBLE_SLIT;
const MASK_Z = simXToZ(cfg.maskX);
const SCREEN_Z = simXToZ(cfg.screenX);
const SLIT_X = simYToX(cfg.slitSeparation / 2);
const SLIT_HALF = (cfg.slitWidth * S) / 2;
const MASK_HEIGHT = 0.6;
const HIST_HEIGHT = 1.0;
const HIT_ATTRIBUTES: readonly (readonly [string, number])[] = [
  ['position', 3],
  ['aBirth', 1],
  ['aBranch', 1],
];
/** Seconds to play back one particle's full simulated journey. */
const CYCLE = 3.2;

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

/** Rebin a screen distribution (rows of width dy) exactly into histogram bins across the screen. */
function rebin(pattern: Float64Array, y0: number, dy: number): Float32Array {
  const bins = new Float32Array(HIST_BINS);
  const lo = REGION.y0;
  const w = (REGION.y1 - REGION.y0) / HIST_BINS;
  for (let j = 0; j < pattern.length; j++) {
    const a = y0 + (j - 0.5) * dy;
    const b = a + dy;
    for (let k = Math.max(0, Math.floor((a - lo) / w)); k < HIST_BINS && lo + k * w < b; k++) {
      const overlap = Math.min(b, lo + (k + 1) * w) - Math.max(a, lo + k * w);
      if (overlap > 0) bins[k] += (pattern[j] * overlap) / dy;
    }
  }
  return bins;
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
          uSize: { value: tier === 'low' ? 1.6 : 1.25 },
          uPixelRatio: { value: 1 },
        },
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [tier],
  );

  const histData = useMemo(() => new Float32Array(HIST_BINS * 2), []);
  const histTex = useDisposable(() => {
    const t = new DataTexture(histData, HIST_BINS, 1, RGFormat, FloatType);
    t.minFilter = t.magFilter = NearestFilter;
    t.needsUpdate = true;
    return t;
  }, [histData]);
  const histGeo = useDisposable(() => new PlaneGeometry(PLANE_WIDTH, HIST_HEIGHT), []);
  const histMat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: histVert,
        fragmentShader: histFrag,
        uniforms: { uHist: { value: histTex }, uShowPrediction: { value: 0 } },
      }),
    [histTex],
  );
  const predicted = useMemo(
    () => ({
      coherent: rebin(data.coherent, data.grid.y0, data.grid.dy),
      whichPath: rebin(data.whichPath, data.grid.y0, data.grid.dy),
    }),
    [data],
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
    lastHist: 0,
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

    engine.update(c.now, dt, st.rate, st.measuring, active);

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
    c.ringFade += ((st.measuring ? 1 : 0) - c.ringFade) * Math.min(1, dt * 6);
    ringUpper.opacity = c.ringFade;
    ringLower.opacity = c.ringFade;
    ringUpper.color.setRGB(1, 0.24, 0.73).multiplyScalar(0.5 + 2.5 * engine.flashUpper);
    ringLower.color.setRGB(1, 0.24, 0.73).multiplyScalar(0.5 + 2.5 * engine.flashLower);
    if (upperRef.current) upperRef.current.visible = c.ringFade > 0.01;
    if (lowerRef.current) lowerRef.current.visible = c.ringFade > 0.01;

    if (engine.histDirty && c.now - c.lastHist > 0.1) {
      c.lastHist = c.now;
      engine.histDirty = false;
      const pred = st.measuring ? predicted.whichPath : predicted.coherent;
      let maxCount = 0;
      let maxPred = 0;
      for (let k = 0; k < HIST_BINS; k++) {
        maxCount = Math.max(maxCount, engine.hist[k]);
        maxPred = Math.max(maxPred, pred[k]);
      }
      const n = engine.detected;
      const scale = 0.92 / Math.max(maxCount, n * maxPred, 1);
      for (let k = 0; k < HIST_BINS; k++) {
        histData[2 * k] = engine.hist[k] * scale;
        histData[2 * k + 1] = n > 0 ? n * pred[k] * scale : -1;
      }
      histTex.needsUpdate = true;
    }
    histMat.uniforms.uShowPrediction.value = st.showPrediction ? 1 : 0;

    if (c.now - c.lastSync > 0.25 && st.detected !== engine.detected) {
      c.lastSync = c.now;
      useDoubleSlit.setState({ detected: engine.detected });
    }
  });

  return (
    <>
      <mesh geometry={waveGeo} material={waveMat} rotation={[-Math.PI / 2, 0, 0]} />
      <points geometry={hitsGeo} material={hitsMat} />
      <mesh
        geometry={histGeo}
        material={histMat}
        position={[0, SCREEN_HEIGHT + 0.2 + HIST_HEIGHT / 2, SCREEN_Z - 0.03]}
      />
      <mesh ref={upperRef} geometry={ringGeo} material={ringUpper} position={[SLIT_X, 0.3, MASK_Z + 0.2]} />
      <mesh ref={lowerRef} geometry={ringGeo} material={ringLower} position={[-SLIT_X, 0.3, MASK_Z + 0.2]} />
    </>
  );
}

export default function DoubleSlitScene({ active }: SceneProps) {
  const tier = useTier();
  const quality = tier === 'low' ? 'low' : 'high';
  const [data, setData] = useState<DoubleSlitData | null>(null);
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
      <Mask />
      <ScreenPanel />
      <Emitter />
      {data && <Experiment data={data} active={active} />}
    </group>
  );
}
