import { Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  ShaderMaterial,
  Sphere,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import {
  abs2,
  arg,
  BASIS_AXIS,
  BASIS_KETS,
  basisAmplitudes,
  blochVector,
  fromVector,
  type Basis,
} from '../../physics/bloch';
import { useDisposable } from '../../hooks/useDisposable';
import { phaseColor } from '../../lib/colors';
import { selectReducedMotion, useSettings } from '../../state/settings';
import sphereVert from '../../three/shaders/superposition/sphere.vert.glsl?raw';
import sphereFrag from '../../three/shaders/superposition/sphere.frag.glsl?raw';
import type { SceneProps } from '../registry';
import { displayedState, useSuperposition } from './store';

const R = 2.3;
const BAR_MAX = 3.2;
const BAR_BASE = -1.7;
const BAR_X = [R + 1.9, R + 2.9];

/** Bloch (x, y, z) → sphere-local world axes: x toward the viewer, y right, z up. */
function blochToLocal(x: number, y: number, z: number, out: Vector3): Vector3 {
  return out.set(y, z, x);
}

const UP = new Vector3(0, 1, 0);
const tmpA = new Vector3();
const tmpB = new Vector3();
const tmpQ = new Quaternion();
const tmpColor = new Color();

const POLE_LABELS: { ket: string; bloch: [number, number, number] }[] = [
  { ket: '|0⟩', bloch: [0, 0, 1] },
  { ket: '|1⟩', bloch: [0, 0, -1] },
  { ket: '|+⟩', bloch: [1, 0, 0] },
  { ket: '|−⟩', bloch: [-1, 0, 0] },
  { ket: '|+i⟩', bloch: [0, 1, 0] },
  { ket: '|−i⟩', bloch: [0, -1, 0] },
];

function Label({
  children,
  position,
  className = '',
}: {
  children: string;
  position: [number, number, number];
  className?: string;
}) {
  return (
    <Html position={position} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <span
        aria-hidden="true"
        className={`font-mono text-sm whitespace-nowrap text-slate-200 select-none ${className}`}
      >
        {children}
      </span>
    </Html>
  );
}

export default function SuperpositionScene(_props: SceneProps) {
  const basis = useSuperposition((s) => s.basis);

  const sphereGeo = useDisposable(() => new SphereGeometry(R, 64, 32), []);
  const sphereMat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: sphereVert,
        fragmentShader: sphereFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  const axisGeo = useDisposable(() => new CylinderGeometry(0.012, 0.012, 2 * R + 0.8, 8), []);
  const poleGeo = useDisposable(() => new SphereGeometry(0.06, 16, 8), []);
  const shaftGeo = useDisposable(() => new CylinderGeometry(0.045, 0.045, 1, 12), []);
  const tipGeo = useDisposable(() => new ConeGeometry(0.14, 0.34, 20), []);
  const orbGeo = useDisposable(() => new SphereGeometry(0.17, 24, 16), []);
  const orbHitGeo = useDisposable(() => new SphereGeometry(0.45, 12, 8), []);
  const ringGeo = useDisposable(() => new TorusGeometry(R, 0.03, 8, 96), []);
  const barGeo = useDisposable(() => {
    const g = new BoxGeometry(0.55, 1, 0.55);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const barFrameGeo = useDisposable(() => {
    const box = new BoxGeometry(0.6, BAR_MAX, 0.6);
    box.translate(0, BAR_MAX / 2, 0);
    const edges = new EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);
  const projGeo = useDisposable(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(6), 3));
    g.setAttribute('lineDistance', new BufferAttribute(new Float32Array(2), 1));
    return g;
  }, []);

  const mats = useDisposable(() => {
    const m = {
      axis: new MeshBasicMaterial({ color: new Color(0.25, 0.3, 0.5) }),
      axisActive: new MeshBasicMaterial({ color: new Color(0.3, 1.4, 1.8) }),
      pole: new MeshBasicMaterial({ color: new Color(0.6, 0.7, 1.0) }),
      arrow: new MeshBasicMaterial({ color: new Color(0.95, 0.8, 1.5) }),
      orb: new MeshBasicMaterial({ color: new Color(2.2, 1.9, 2.8) }),
      hidden: new MeshBasicMaterial({ visible: false }),
      flash: new MeshBasicMaterial({
        color: new Color(1.8, 0.4, 1.3),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      bar0: new MeshBasicMaterial({ color: new Color() }),
      bar1: new MeshBasicMaterial({ color: new Color() }),
      barFrame: new LineBasicMaterial({ color: new Color(0.4, 0.5, 0.8), transparent: true, opacity: 0.35 }),
      proj: new LineDashedMaterial({ color: new Color(1.4, 0.4, 1.1), dashSize: 0.12, gapSize: 0.08 }),
      projDot: new MeshBasicMaterial({ color: new Color(1.8, 0.5, 1.4) }),
    };
    return { ...m, dispose: () => Object.values(m).forEach((x) => x.dispose()) };
  }, []);

  const arrow = useRef<Group>(null);
  const shaft = useRef<Mesh>(null);
  const tip = useRef<Mesh>(null);
  const orb = useRef<Group>(null);
  const flash = useRef<Mesh>(null);
  const bar0 = useRef<Mesh>(null);
  const bar1 = useRef<Mesh>(null);
  const projDot = useRef<Mesh>(null);
  const sphereGroup = useRef<Group>(null);
  const pct0 = useRef<HTMLSpanElement>(null);
  const pct1 = useRef<HTMLSpanElement>(null);

  const anim = useMemo(
    () => ({
      dir: new Vector3(0, 1, 0),
      target: new Vector3(),
      h0: 0.5,
      h1: 0.5,
      flashT: 1,
      token: -1,
      init: false,
    }),
    [],
  );
  const dragging = useRef(false);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const st = useSuperposition.getState();
    const reduced = selectReducedMotion(useSettings.getState());
    const q = displayedState(st);
    const r = blochVector(q);
    blochToLocal(r[0], r[1], r[2], anim.target);

    // Measurement = interaction: a flash sweeps the sphere, then the state snaps to the eigenstate.
    if (anim.token !== st.measureToken) {
      if (anim.token !== -1) anim.flashT = 0;
      anim.token = st.measureToken;
    }
    if (!anim.init || reduced || dragging.current) {
      anim.dir.copy(anim.target);
      anim.init = true;
    } else {
      const k = st.collapsed ? 14 : 10;
      anim.dir.lerp(anim.target, 1 - Math.exp(-k * dt)).normalize();
    }

    if (arrow.current && shaft.current && tip.current && orb.current) {
      tmpQ.setFromUnitVectors(UP, anim.dir);
      arrow.current.quaternion.copy(tmpQ);
      shaft.current.scale.set(1, R - 0.3, 1);
      shaft.current.position.set(0, (R - 0.3) / 2, 0);
      tip.current.position.set(0, R - 0.17, 0);
      orb.current.position.copy(anim.dir).multiplyScalar(R);
    }

    // Projection of the state onto the measurement axis: its length sets the odds.
    const n = BASIS_AXIS[st.basis];
    blochToLocal(n[0], n[1], n[2], tmpA);
    const dot = anim.dir.dot(tmpA);
    tmpB.copy(tmpA).multiplyScalar(dot * R);
    const pos = projGeo.attributes.position as BufferAttribute;
    pos.setXYZ(0, anim.dir.x * R, anim.dir.y * R, anim.dir.z * R);
    pos.setXYZ(1, tmpB.x, tmpB.y, tmpB.z);
    pos.needsUpdate = true;
    const ld = projGeo.attributes.lineDistance as BufferAttribute;
    ld.setX(1, tmpB.distanceTo(tmpA.copy(anim.dir).multiplyScalar(R)));
    ld.needsUpdate = true;
    projDot.current?.position.copy(tmpB);

    if (flash.current) {
      anim.flashT = Math.min(1, anim.flashT + dt / 0.6);
      flash.current.visible = anim.flashT < 1;
      const s = 0.2 + 0.9 * anim.flashT;
      flash.current.scale.setScalar(s);
      (flash.current.material as MeshBasicMaterial).opacity = 1 - anim.flashT;
      blochToLocal(n[0], n[1], n[2], tmpA);
      flash.current.quaternion.setFromUnitVectors(tmpB.set(0, 0, 1), tmpA);
    }

    // Amplitude bars: height = probability, colour = phase of the amplitude.
    const [a0, a1] = basisAmplitudes(q, st.basis);
    const k = reduced ? 1 : 1 - Math.exp(-8 * dt);
    anim.h0 += (abs2(a0) - anim.h0) * k;
    anim.h1 += (abs2(a1) - anim.h1) * k;
    if (bar0.current && bar1.current) {
      bar0.current.scale.set(1, Math.max(anim.h0 * BAR_MAX, 0.001), 1);
      bar1.current.scale.set(1, Math.max(anim.h1 * BAR_MAX, 0.001), 1);
      phaseColor(arg(a0), tmpColor);
      mats.bar0.color.copy(tmpColor).multiplyScalar(0.85);
      phaseColor(arg(a1), tmpColor);
      mats.bar1.color.copy(tmpColor).multiplyScalar(0.85);
    }
    if (pct0.current) pct0.current.textContent = `${Math.round(anim.h0 * 100)}%`;
    if (pct1.current) pct1.current.textContent = `${Math.round(anim.h1 * 100)}%`;
  });

  // Drag the orb over the sphere to prepare any state.
  const sphere = useMemo(() => new Sphere(new Vector3(), R), []);
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = true;
    document.body.style.cursor = 'grabbing';
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current || !sphereGroup.current) return;
    e.stopPropagation();
    sphereGroup.current.getWorldPosition(sphere.center);
    const p = e.ray.intersectSphere(sphere, tmpA) ?? e.ray.closestPointToPoint(sphere.center, tmpA);
    sphereGroup.current.worldToLocal(p);
    // Local (x, y, z) = Bloch (y, z, x).
    useSuperposition.getState().setPrepared(fromVector(p.z, p.x, p.y));
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    dragging.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
    document.body.style.cursor = '';
  };

  const axes: { basis: Basis; rot: [number, number, number] }[] = [
    { basis: 'z', rot: [0, 0, 0] },
    { basis: 'x', rot: [Math.PI / 2, 0, 0] },
    { basis: 'y', rot: [0, 0, Math.PI / 2] },
  ];
  const kets = BASIS_KETS[basis];

  return (
    <group position={[-1.9, 0.2, 0]}>
      <group ref={sphereGroup} rotation={[0.18, -0.55, 0]}>
        <mesh geometry={sphereGeo} material={sphereMat} />
        {axes.map((a) => (
          <mesh
            key={a.basis}
            geometry={axisGeo}
            material={a.basis === basis ? mats.axisActive : mats.axis}
            rotation={a.rot}
          />
        ))}
        {POLE_LABELS.map((p) => {
          const v = blochToLocal(p.bloch[0], p.bloch[1], p.bloch[2], new Vector3());
          return (
            <group key={p.ket}>
              <mesh geometry={poleGeo} material={mats.pole} position={v.clone().multiplyScalar(R)} />
              <Label position={v.multiplyScalar(R + 0.45).toArray()}>{p.ket}</Label>
            </group>
          );
        })}
        <group ref={arrow}>
          <mesh ref={shaft} geometry={shaftGeo} material={mats.arrow} />
          <mesh ref={tip} geometry={tipGeo} material={mats.arrow} />
        </group>
        <group ref={orb}>
          <mesh geometry={orbGeo} material={mats.orb} />
          <mesh
            geometry={orbHitGeo}
            material={mats.hidden}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerOver={() => !dragging.current && (document.body.style.cursor = 'grab')}
            onPointerOut={() => !dragging.current && (document.body.style.cursor = '')}
          />
        </group>
        <lineSegments geometry={projGeo} material={mats.proj} />
        <mesh ref={projDot} geometry={poleGeo} material={mats.projDot} />
        <mesh ref={flash} geometry={ringGeo} material={mats.flash} visible={false} />
      </group>

      {BAR_X.map((x, i) => (
        <group key={i} position={[x, BAR_BASE, 0]}>
          <mesh ref={i === 0 ? bar0 : bar1} geometry={barGeo} material={i === 0 ? mats.bar0 : mats.bar1} />
          <lineSegments geometry={barFrameGeo} material={mats.barFrame} />
          <Label position={[0, -0.35, 0]}>{`|${kets[i]}⟩`}</Label>
          <Html
            position={[0, BAR_MAX + 0.35, 0]}
            center
            zIndexRange={[5, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <span
              ref={i === 0 ? pct0 : pct1}
              aria-hidden="true"
              className="font-mono text-sm text-cyan select-none"
            />
          </Html>
        </group>
      ))}
    </group>
  );
}
