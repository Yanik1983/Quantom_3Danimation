import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DynamicDrawUsage,
  EdgesGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { liveRng } from '../../lib/random';
import { selectReducedMotion, useSettings } from '../../state/settings';
import type { SceneProps } from '../registry';
import { PairEngine, SLOTS } from './engine';
import { useEntanglement } from './store';

/** Detectors sit at x = ±D, the source at the centre, all at height Y. */
const D = 1.55;
const Y = 0.85;
/** Idle on the lab table: one pair every IDLE_EVERY seconds. */
const IDLE_EVERY = 2.6;

const dummy = new Object3D();
const UP = new Color(0.1, 0.75, 1.1);
const DOWN = new Color(1.1, 0.12, 0.6);

function Detector({
  side,
  arrow,
  lamp,
}: {
  side: -1 | 1;
  arrow: React.RefObject<Group | null>;
  lamp: MeshBasicMaterial;
}) {
  const body = useDisposable(() => new BoxGeometry(0.5, 1.2, 0.8), []);
  const edges = useDisposable(() => new EdgesGeometry(body), [body]);
  const shaft = useDisposable(() => new CylinderGeometry(0.05, 0.05, 0.42, 12).translate(0, -0.08, 0), []);
  const head = useDisposable(() => new ConeGeometry(0.15, 0.24, 20).translate(0, 0.24, 0), []);
  const dark = useDisposable(() => new MeshBasicMaterial({ color: new Color('#0a0d1c') }), []);
  const rim = useDisposable(() => new LineBasicMaterial({ color: new Color(0.35, 0.3, 0.95) }), []);
  return (
    <group position={[side * (D + 0.28), Y, 0]}>
      <mesh geometry={body} material={dark} />
      <lineSegments geometry={edges} material={rim} />
      {/* The result: an arrow on the detector's face, up or down. */}
      <group ref={arrow} position={[-side * 0.05, 0, 0.47]}>
        <mesh geometry={shaft} material={lamp} />
        <mesh geometry={head} material={lamp} />
      </group>
    </group>
  );
}

export default function EntanglementScene({ active }: SceneProps) {
  const engine = useMemo(() => new PairEngine(liveRng), []);

  const particleGeo = useDisposable(() => new SphereGeometry(0.085, 16, 12), []);
  const particleMat = useDisposable(() => new MeshBasicMaterial({ color: new Color(0.8, 0.75, 1.4) }), []);
  const sourceGeo = useDisposable(() => new SphereGeometry(0.15, 32, 16), []);
  const sourceMat = useDisposable(() => new MeshBasicMaterial({ color: new Color(0.9, 0.4, 1.6) }), []);
  const leftLamp = useDisposable(() => new MeshBasicMaterial({ color: UP.clone() }), []);
  const rightLamp = useDisposable(() => new MeshBasicMaterial({ color: DOWN.clone() }), []);
  // A glowing thread joins the two members of every pair while they fly: one shared state.
  const linkGeo = useDisposable(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(SLOTS * 6), 3).setUsage(DynamicDrawUsage),
    );
    g.setDrawRange(0, 0);
    return g;
  }, []);
  const linkMat = useDisposable(
    () =>
      new LineBasicMaterial({
        color: new Color(0.45, 0.22, 1.0),
        transparent: true,
        opacity: 0.8,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  const particles = useRef<InstancedMesh>(null);
  const leftArrow = useRef<Group>(null);
  const rightArrow = useRef<Group>(null);
  const source = useRef<Group>(null);
  const clock = useRef({ now: 0, token: useEntanglement.getState().request.token, nextIdle: 1 });

  useEffect(() => {
    if (!active) return;
    useEntanglement.getState().reset();
  }, [active]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = clock.current;
    c.now += dt;
    const st = useEntanglement.getState();
    if (st.request.token !== c.token) {
      c.token = st.request.token;
      if (st.request.n === 0) engine.clear();
      else engine.request(st.request.n, c.now);
    }
    if (!active && engine.pending === 0 && c.now >= c.nextIdle) {
      engine.request(1, c.now);
      c.nextIdle = c.now + IDLE_EVERY;
    }

    const measured = engine.update(c.now);

    // Particles and their links.
    const inst = particles.current;
    const pos = linkGeo.attributes.position as BufferAttribute;
    let flying = 0;
    if (inst) {
      for (let i = 0; i < SLOTS; i++) {
        const f = engine.progress(i, c.now);
        const x = f < 0 ? 0 : f * D;
        dummy.scale.setScalar(f < 0 ? 0 : 1);
        dummy.position.set(-x, Y, 0);
        dummy.updateMatrix();
        inst.setMatrixAt(2 * i, dummy.matrix);
        dummy.position.set(x, Y, 0);
        dummy.updateMatrix();
        inst.setMatrixAt(2 * i + 1, dummy.matrix);
        if (f >= 0) {
          pos.setXYZ(2 * flying, -x, Y, 0);
          pos.setXYZ(2 * flying + 1, x, Y, 0);
          flying++;
        }
      }
      inst.instanceMatrix.needsUpdate = true;
    }
    pos.needsUpdate = flying > 0;
    linkGeo.setDrawRange(0, flying * 2);

    // Detectors: arrow up (cyan) or down (magenta), flashing at each detection.
    const l = engine.last;
    const reduced = selectReducedMotion(useSettings.getState());
    if (l.at >= 0) {
      const flash = reduced ? 1 : 1 + 1.2 * Math.exp(-(c.now - l.at) * 5);
      leftLamp.color.copy(l.left > 0 ? UP : DOWN).multiplyScalar(flash);
      rightLamp.color.copy(l.right > 0 ? UP : DOWN).multiplyScalar(flash);
      leftArrow.current?.rotation.set(0, 0, l.left > 0 ? 0 : Math.PI);
      rightArrow.current?.rotation.set(0, 0, l.right > 0 ? 0 : Math.PI);
    }
    // No result shown until the first detection.
    if (leftArrow.current) leftArrow.current.visible = l.at >= 0;
    if (rightArrow.current) rightArrow.current.visible = l.at >= 0;
    if (source.current && !reduced) source.current.scale.setScalar(1 + 0.1 * Math.sin(c.now * 5));

    if (active && (measured > 0 || st.inFlight !== engine.pending)) {
      useEntanglement.setState({
        inFlight: engine.pending,
        summary: {
          pairs: engine.pairs,
          opposite: engine.opposite,
          leftUp: engine.leftUp,
          last: engine.pairs > 0 ? { left: l.left, right: l.right } : null,
        },
      });
    }
  });

  return (
    <group>
      <group ref={source} position={[0, Y, 0]}>
        <mesh geometry={sourceGeo} material={sourceMat} />
      </group>
      <instancedMesh ref={particles} args={[particleGeo, particleMat, 2 * SLOTS]} frustumCulled={false} />
      <lineSegments geometry={linkGeo} material={linkMat} frustumCulled={false} />
      <Detector side={-1} arrow={leftArrow} lamp={leftLamp} />
      <Detector side={1} arrow={rightArrow} lamp={rightLamp} />
    </group>
  );
}
