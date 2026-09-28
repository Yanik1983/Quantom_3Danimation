import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { productDistribution, thetaForP1 } from '../../physics/qubits';
import { selectReducedMotion, useSettings } from '../../state/settings';
import { textTexture } from '../../three/textSprite';
import type { SceneProps } from '../registry';
import { MAX_QUBITS, useQubits } from './store';

/** Seconds a measured arrow stays at its pole before a fresh qubit is prepared. */
const HOLD = 2.4;
const BARS = 1 << MAX_QUBITS;
const BAR_ROW = 3.2;
const BAR_Z = 1.2;
const BAR_H = 0.8;
const BAR_MAX_W = 0.32;
const SPHERE_Y = 1.95;

const UP = new Vector3(0, 1, 0);
const dir = new Vector3();
const q = new Quaternion();
const dummy = new Object3D();
const BAR_BASE = new Color(0.08, 0.42, 0.62);
const BAR_HIT = new Color(2.4, 0.5, 1.6);
const BAR_DIM = new Color(0.04, 0.12, 0.2);

function layout(n: number) {
  const r = n === 1 ? 0.8 : n === 2 ? 0.68 : n === 3 ? 0.55 : 0.44;
  const gap = r * 2 + 0.3;
  return { r, x: (i: number) => (i - (n - 1) / 2) * gap };
}

function BlochSphere({ index, arrow }: { index: number; arrow: React.RefObject<Group | null> }) {
  const count = useQubits((s) => s.count);
  const { r, x } = layout(count);
  const shell = useDisposable(() => new SphereGeometry(1, 32, 20), []);
  const ring = useDisposable(() => new TorusGeometry(1, 0.012, 6, 96), []);
  const shaft = useDisposable(() => new CylinderGeometry(0.035, 0.035, 0.8, 12).translate(0, 0.4, 0), []);
  const head = useDisposable(() => new ConeGeometry(0.1, 0.22, 20).translate(0, 0.89, 0), []);
  const shellMat = useDisposable(
    () =>
      new MeshBasicMaterial({
        color: new Color(0.05, 0.12, 0.3),
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  const ringMat = useDisposable(() => new MeshBasicMaterial({ color: new Color(0.25, 0.2, 0.7) }), []);
  const arrowMat = useDisposable(() => new MeshBasicMaterial({ color: new Color(0.4, 2.2, 2.8) }), []);
  const zero = useDisposable(() => textTexture('0', '#e6f9ff'), []);
  const one = useDisposable(() => textTexture('1', '#ffd6f0'), []);
  const zeroMat = useDisposable(
    () => new SpriteMaterial({ map: zero, transparent: true, depthWrite: false }),
    [zero],
  );
  const oneMat = useDisposable(
    () => new SpriteMaterial({ map: one, transparent: true, depthWrite: false }),
    [one],
  );

  if (index >= count) return null;
  return (
    <group position={[x(index), SPHERE_Y, -0.35]} scale={r}>
      <mesh geometry={shell} material={shellMat} />
      <mesh geometry={ring} material={ringMat} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={ring} material={ringMat} />
      <sprite material={zeroMat} position={[0, 1.32, 0]} scale={0.42} />
      <sprite material={oneMat} position={[0, -1.32, 0]} scale={0.42} />
      <group ref={arrow}>
        <mesh geometry={shaft} material={arrowMat} />
        <mesh geometry={head} material={arrowMat} />
      </group>
    </group>
  );
}

export default function QubitsScene({ active }: SceneProps) {
  const arrows = [
    useRef<Group>(null),
    useRef<Group>(null),
    useRef<Group>(null),
    useRef<Group>(null),
  ] as const;
  const barGeo = useDisposable(() => new BoxGeometry(1, 1, 0.22).translate(0, 0.5, 0), []);
  const barMat = useDisposable(() => new MeshBasicMaterial({ color: 0xffffff }), []);
  const bars = useRef<InstancedMesh>(null);

  const anim = useRef({
    time: 0,
    measuredAt: -Infinity,
    token: -1,
    theta: new Float64Array(MAX_QUBITS),
    heights: new Float64Array(BARS),
    dist: productDistribution(1, 0.5),
    distCount: 1,
    distP1: 0.5,
  });

  useEffect(() => {
    if (active) useQubits.getState().reset();
  }, [active]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const a = anim.current;
    const st = useQubits.getState();
    const reduced = selectReducedMotion(useSettings.getState());
    a.time += dt;
    if (st.measureToken !== a.token) {
      if (a.token >= 0 && st.result) a.measuredAt = a.time;
      a.token = st.measureToken;
    }
    const showing = active && st.result !== null && a.time - a.measuredAt < HOLD;

    // Arrows: tilt θ sets the odds; the slow turn about the vertical is the phase (precession).
    const theta = thetaForP1(st.p1);
    const phi = reduced ? 0.6 : a.time * 0.7;
    for (let i = 0; i < MAX_QUBITS; i++) {
      const target = showing && st.result ? (st.result[i] ? Math.PI : 0) : theta;
      a.theta[i] += (target - a.theta[i]) * Math.min(1, dt * (showing ? 12 : 5));
      const g = arrows[i].current;
      if (!g) continue;
      const s = Math.sin(a.theta[i]);
      dir.set(s * Math.cos(phi), Math.cos(a.theta[i]), s * Math.sin(phi));
      g.quaternion.copy(q.setFromUnitVectors(UP, dir));
    }

    // Bars: the odds of every possible result of measuring all the qubits.
    if (st.count !== a.distCount || st.p1 !== a.distP1) {
      a.dist = productDistribution(st.count, st.p1);
      a.distCount = st.count;
      a.distP1 = st.p1;
    }
    const m = bars.current;
    if (!m) return;
    const n = a.dist.length;
    let max = 0;
    for (let k = 0; k < n; k++) max = Math.max(max, a.dist[k]);
    const w = BAR_ROW / n;
    let hit = -1;
    if (showing && st.result) {
      hit = 0;
      for (let i = 0; i < st.result.length; i++) hit = (hit << 1) | st.result[i];
    }
    for (let k = 0; k < BARS; k++) {
      const want = k < n ? Math.max(0.02, (a.dist[k] / max) * BAR_H) : 0;
      a.heights[k] += (want - a.heights[k]) * Math.min(1, dt * 8);
      dummy.position.set((k - (n - 1) / 2) * w, 0.02, BAR_Z);
      dummy.scale.set(k < n ? Math.min(BAR_MAX_W, w * 0.7) : 0, Math.max(1e-3, a.heights[k]), 1);
      dummy.updateMatrix();
      m.setMatrixAt(k, dummy.matrix);
      m.setColorAt(k, hit < 0 ? BAR_BASE : k === hit ? BAR_HIT : BAR_DIM);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {arrows.map((ref, i) => (
        <BlochSphere key={i} index={i} arrow={ref} />
      ))}
      <instancedMesh ref={bars} args={[barGeo, barMat, BARS]} frustumCulled={false} />
    </group>
  );
}
