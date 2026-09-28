import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { angleDiff } from '../../physics/bell';
import { useDisposable } from '../../hooks/useDisposable';
import { selectReducedMotion, useSettings } from '../../state/settings';
import type { SceneProps } from '../registry';
import { BellEngine, MAX_VISIBLE, SETTINGS } from './engine';
import { useEntanglement, type BellSummary } from './store';

/** Detectors sit at x = ±D; a particle takes FLIGHT seconds to get there. */
const D = 3.9;
const FLIGHT = 1.1;
const RING_R = 0.9;

const dummy = new Object3D();
const PLUS = new Color(0.13, 0.89, 1.0);
const MINUS = new Color(1.0, 0.24, 0.73);

function summarize(e: BellEngine): BellSummary {
  const s = SETTINGS[e.test];
  const cells: BellSummary['cells'] = [];
  for (let i = 0; i < s.alice.length; i++) {
    for (let j = 0; j < s.bob.length; j++) {
      const q = e.correlation(i, j, 'q');
      const c = e.correlation(i, j, 'c');
      cells.push({
        i,
        j,
        delta: angleDiff(s.alice[i], s.bob[j]),
        q: q.e,
        qse: q.se,
        c: c.e,
        cse: c.se,
        n: q.n,
      });
    }
  }
  return {
    total: e.total,
    agreeQ: e.agreeQ,
    agreeC: e.agreeC,
    cells,
    alicePlusByBob: Array.from(e.alicePlusByBob, (v, j) => (e.countByBob[j] ? v / e.countByBob[j] : NaN)),
  };
}

function Detector({
  side,
  label,
  angles,
  needle,
  lamp,
}: {
  side: -1 | 1;
  label: string;
  angles: readonly number[];
  needle: React.RefObject<Group | null>;
  lamp: React.RefObject<MeshBasicMaterial | null>;
}) {
  const ring = useDisposable(() => new TorusGeometry(RING_R, 0.04, 12, 96), []);
  const tick = useDisposable(() => new SphereGeometry(0.07, 12, 8), []);
  const bar = useDisposable(() => {
    const g = new BoxGeometry(0.06, RING_R * 0.9, 0.06);
    g.translate(0, (RING_R * 0.9) / 2, 0);
    return g;
  }, []);
  const lampGeo = useDisposable(() => new SphereGeometry(0.22, 24, 16), []);
  const mats = useDisposable(() => {
    const ring = new MeshBasicMaterial({ color: new Color(0.35, 0.3, 0.9) });
    const tick = new MeshBasicMaterial({ color: new Color(0.5, 0.55, 0.9) });
    const needle = new MeshBasicMaterial({ color: new Color(1.6, 1.4, 2.2) });
    return { ring, tick, needle, dispose: () => [ring, tick, needle].forEach((m) => m.dispose()) };
  }, []);
  const lampMat = useDisposable(() => new MeshBasicMaterial({ color: new Color(0.2, 0.2, 0.3) }), []);
  useEffect(() => {
    lamp.current = lampMat;
  }, [lamp, lampMat]);

  return (
    // Display choice: the ring faces the viewer so the measurement direction (really
    // perpendicular to the flight path) can be read at a glance.
    <group position={[side * D, 0, 0]}>
      <mesh geometry={ring} material={mats.ring} />
      {angles.map((a) => (
        <mesh
          key={a}
          geometry={tick}
          material={mats.tick}
          position={[Math.sin(a) * RING_R, Math.cos(a) * RING_R, 0]}
        />
      ))}
      <group ref={needle}>
        <mesh geometry={bar} material={mats.needle} />
      </group>
      <mesh geometry={lampGeo} material={lampMat} position={[0, RING_R + 0.65, 0]} />
      <Html position={[0, -RING_R - 0.55, 0]} center zIndexRange={[5, 0]}>
        <span
          aria-hidden="true"
          className="pointer-events-none font-display text-sm whitespace-nowrap text-slate-200 select-none"
        >
          {label}
        </span>
      </Html>
    </group>
  );
}

export default function EntanglementScene({ active }: SceneProps) {
  const test = useEntanglement((s) => s.test);
  const settings = SETTINGS[test];
  const engine = useMemo(
    () => new BellEngine(test, FLIGHT, crypto.getRandomValues(new Uint32Array(1))[0]),
    [test],
  );

  const particleGeo = useDisposable(() => new SphereGeometry(0.11, 16, 12), []);
  const particleMat = useDisposable(
    () =>
      new MeshBasicMaterial({
        color: new Color(1.4, 1.6, 2.4),
        transparent: true,
        blending: AdditiveBlending,
      }),
    [],
  );
  const sourceGeo = useDisposable(() => new SphereGeometry(0.3, 32, 16), []);
  const sourceMat = useDisposable(() => new MeshBasicMaterial({ color: new Color(1.2, 0.6, 2.0) }), []);
  const particles = useRef<InstancedMesh>(null);
  const aliceNeedle = useRef<Group>(null);
  const bobNeedle = useRef<Group>(null);
  const aliceLamp = useRef<MeshBasicMaterial>(null);
  const bobLamp = useRef<MeshBasicMaterial>(null);
  const source = useRef<Group>(null);
  const clock = useRef({ now: 0, lastSync: 0, clearToken: useEntanglement.getState().clearToken });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = clock.current;
    c.now += dt;
    const st = useEntanglement.getState();
    if (st.clearToken !== c.clearToken) {
      c.clearToken = st.clearToken;
      engine.clear();
    }
    engine.update(c.now, dt, st.rate, active);

    const inst = particles.current;
    if (inst) {
      for (let v = 0; v < MAX_VISIBLE; v++) {
        const t0 = engine.visible[v];
        const f = t0 >= 0 ? Math.min(1, (c.now - t0) / FLIGHT) : 0;
        dummy.scale.setScalar(t0 >= 0 ? 1 : 0);
        dummy.position.set(-f * D, 0, 0); // toward Alice
        dummy.updateMatrix();
        inst.setMatrixAt(2 * v, dummy.matrix);
        dummy.position.set(f * D, 0, 0); // toward Bob
        dummy.updateMatrix();
        inst.setMatrixAt(2 * v + 1, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    }

    // Detector displays: the setting used for the latest pair and its result.
    const l = engine.last;
    const reduced = selectReducedMotion(useSettings.getState());
    if (l.at >= 0) {
      aliceNeedle.current?.rotation.set(0, 0, -settings.alice[l.ia]);
      bobNeedle.current?.rotation.set(0, 0, -settings.bob[l.ib]);
      const flash = reduced ? 0.6 : 0.35 + 1.4 * Math.exp(-(c.now - l.at) * 4);
      aliceLamp.current?.color.copy(l.A > 0 ? PLUS : MINUS).multiplyScalar(flash);
      bobLamp.current?.color.copy(l.B > 0 ? PLUS : MINUS).multiplyScalar(flash);
    }
    if (source.current && !reduced) source.current.scale.setScalar(1 + 0.08 * Math.sin(c.now * 6));

    if (c.now - c.lastSync > 0.25) {
      c.lastSync = c.now;
      useEntanglement.setState({ summary: summarize(engine) });
    }
  });

  return (
    <group position={[-0.3, 0.3, 0]} rotation={[0.08, -0.12, 0]}>
      <group ref={source}>
        <mesh geometry={sourceGeo} material={sourceMat} />
      </group>
      <instancedMesh
        ref={particles}
        args={[particleGeo, particleMat, 2 * MAX_VISIBLE]}
        frustumCulled={false}
      />
      <Detector side={-1} label="Alice" angles={settings.alice} needle={aliceNeedle} lamp={aliceLamp} />
      <Detector side={1} label="Bob" angles={settings.bob} needle={bobNeedle} lamp={bobLamp} />
      <Html position={[0, -0.75, 0]} center zIndexRange={[5, 0]}>
        <span
          aria-hidden="true"
          className="pointer-events-none font-mono text-xs whitespace-nowrap text-violet-ink select-none"
        >
          entangled-pair source
        </span>
      </Html>
    </group>
  );
}
