import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { ComplexRibbon, type RibbonHandle } from '../../three/ComplexRibbon';
import type { TunnelRequest, TunnelTick } from '../../workers/tunnelingProtocol';
import type { SceneProps } from '../registry';
import { DISPLAY_HALF, DISPLAY_SAMPLES, SIM, SIM_RATE } from './constants';
import { useTunneling } from './store';

const WIDTH = 13;
/** World units per simulation length unit and per energy unit. */
const SX = WIDTH / (2 * DISPLAY_HALF);
const ES = 1.5;
const DEPTH = 1.8;

const COORDS = Float64Array.from(
  { length: DISPLAY_SAMPLES },
  (_, m) => -DISPLAY_HALF + (2 * DISPLAY_HALF * m) / (DISPLAY_SAMPLES - 1),
);

export default function TunnelingScene({ active }: SceneProps) {
  const energy = useTunneling((s) => s.energy);
  const V0 = useTunneling((s) => s.V0);
  const a = useTunneling((s) => s.a);
  const k0 = Math.sqrt(2 * energy);

  const ribbon = useRef<RibbonHandle>(null);
  const ribbonGroup = useRef<Group>(null);
  const barrier = useRef<Mesh>(null);
  const barrierEdges = useRef<Group>(null);

  const geo = useDisposable(() => {
    const box = new BoxGeometry(1, 1, 1);
    const edges = new EdgesGeometry(box);
    const line = new BufferGeometry();
    line.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([-WIDTH / 2, 0, 0, WIDTH / 2, 0, 0]), 3),
    );
    line.setAttribute('lineDistance', new BufferAttribute(new Float32Array([0, WIDTH]), 1));
    return { box, edges, line, dispose: () => [box, edges, line].forEach((g) => g.dispose()) };
  }, []);
  const mats = useDisposable(() => {
    const m = {
      barrier: new MeshBasicMaterial({
        color: new Color(0.35, 0.16, 0.8),
        transparent: true,
        opacity: 0.35,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      barrierEdge: new LineBasicMaterial({ color: new Color(0.8, 0.5, 1.6) }),
      energy: new LineDashedMaterial({ color: new Color(0.3, 1.2, 1.5), dashSize: 0.18, gapSize: 0.12 }),
      floor: new LineBasicMaterial({ color: new Color(0.3, 0.35, 0.6) }),
    };
    return { ...m, dispose: () => Object.values(m).forEach((x) => x.dispose()) };
  }, []);
  const cyan = useMemo(() => new Color(0.133, 0.894, 1.0), []);

  // Worker: at most one tick in flight; the display buffer ping-pongs.
  const w = useRef({ worker: null as Worker | null, spare: null as Float64Array | null, inFlight: false });
  const run = useRef({ lastSync: 0, doneAt: -1, clock: 0 });
  useEffect(() => {
    const worker = new Worker(new URL('../../workers/tunneling.worker.ts', import.meta.url), {
      type: 'module',
    });
    const s = w.current;
    s.worker = worker;
    s.spare = new Float64Array(2 * DISPLAY_SAMPLES);
    worker.onmessage = (e: MessageEvent<TunnelTick>) => {
      const m = e.data;
      s.inFlight = false;
      s.spare = m.buf;
      ribbon.current?.update(COORDS, m.buf, -DISPLAY_HALF, DISPLAY_HALF);
      const r = run.current;
      if (m.done && r.doneAt < 0) r.doneAt = r.clock;
      if (m.done || r.clock - r.lastSync > 0.12) {
        r.lastSync = r.clock;
        useTunneling.setState({ T: m.T, R: m.R, done: m.done });
      }
    };
    return () => {
      worker.terminate();
      s.worker = null;
      s.inFlight = false;
    };
  }, []);

  // Restart on every parameter change or "fire".
  const runToken = useTunneling((s) => s.runToken);
  useEffect(() => {
    const req: TunnelRequest = { type: 'config', config: { k0, V0, a } };
    w.current.worker?.postMessage(req);
    run.current.doneAt = -1;
    useTunneling.setState({ T: 0, R: 0, done: false });
  }, [runToken, k0, V0, a]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const r = run.current;
    r.clock += dt;
    const st = useTunneling.getState();
    // Automatic re-fire a moment after each run completes.
    if (r.doneAt >= 0 && st.autoRepeat && active && r.clock - r.doneAt > 1.8) {
      r.doneAt = -1;
      st.fire();
    }
    const s = w.current;
    if (!active || !s.worker || s.inFlight || !s.spare || r.doneAt >= 0) return;
    const steps = Math.max(1, Math.min(40, Math.round((SIM_RATE * dt) / SIM.dt)));
    const req: TunnelRequest = { type: 'tick', buf: s.spare, steps };
    s.inFlight = true;
    s.spare = null;
    s.worker.postMessage(req, [req.buf.buffer]);
  });

  // Energy diagram: barrier from V = 0 to V₀; the wave rides at height E.
  useEffect(() => {
    const h = Math.max(V0 * ES, 0.001);
    barrier.current?.scale.set(Math.max(a * SX, 0.02), h, DEPTH);
    barrier.current?.position.set(0, h / 2, 0);
    barrierEdges.current?.scale.set(Math.max(a * SX, 0.02), h, DEPTH);
    barrierEdges.current?.position.set(0, h / 2, 0);
    ribbonGroup.current?.position.set(0, energy * ES, 0);
  }, [V0, a, energy]);

  const label = 'pointer-events-none select-none whitespace-nowrap font-mono text-xs';
  return (
    <group position={[0.3, -1.4, 0]} rotation={[0.18, -0.22, 0]}>
      <lineSegments geometry={geo.line} material={mats.floor} />
      <mesh ref={barrier} geometry={geo.box} material={mats.barrier} />
      <group ref={barrierEdges}>
        <lineSegments geometry={geo.edges} material={mats.barrierEdge} />
      </group>
      <group ref={ribbonGroup}>
        <lineSegments geometry={geo.line} material={mats.energy} />
        <ComplexRibbon
          ref={ribbon}
          width={WIDTH}
          amplitude={3}
          densityScale={9}
          samples={DISPLAY_SAMPLES}
          wallZ={-DEPTH / 2 - 0.4}
          wallColor={cyan}
        />
        <Html position={[-WIDTH / 2 - 0.1, 0, 0]} center zIndexRange={[5, 0]}>
          <span aria-hidden="true" className={`${label} -translate-x-3 text-cyan`}>
            E
          </span>
        </Html>
      </group>
      <Html position={[0, V0 * ES + 0.35, 0]} center zIndexRange={[5, 0]}>
        <span aria-hidden="true" className={`${label} text-violet-ink`}>
          V₀
        </span>
      </Html>
      <Html position={[-WIDTH / 2 - 0.1, 0, 0]} center zIndexRange={[5, 0]}>
        <span aria-hidden="true" className={`${label} -translate-x-5 text-slate-400`}>
          V = 0
        </span>
      </Html>
    </group>
  );
}
