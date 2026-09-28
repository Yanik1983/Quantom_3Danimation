import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Line,
  LineBasicMaterial,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { useApplications } from './store';

const L = 2.2;
const TRACE = 240;
/** Displayed precession rate per tesla (rad/s): the real 42.6 MHz/T is slowed ~10⁸×. */
const VIS_OMEGA_PER_T = 1.1;
/** Relaxation times shortened for display (real tissue: T1 ~ 1 s, T2 ~ 0.1 s). */
const T1 = 4;
const T2 = 1.6;
const UP = new Vector3(0, 1, 0);
const dir = new Vector3();
const q = new Quaternion();

/**
 * Nuclear magnetization in a field B₀ obeys the Bloch equations: it precesses about B₀ at
 * the Larmor frequency, and after an RF pulse tips it over, it relaxes back (T1 along B₀,
 * T2 across it). The coil signal is the rotating transverse component.
 */
export function Mri() {
  const geo = useDisposable(() => {
    const shaft = new CylinderGeometry(0.04, 0.04, 1, 12);
    shaft.translate(0, 0.5, 0);
    const tip = new ConeGeometry(0.13, 0.32, 20);
    const axis = new CylinderGeometry(0.015, 0.015, 2 * L + 0.8, 8);
    const axisTip = new ConeGeometry(0.09, 0.25, 16);
    const circle = new BufferGeometry();
    const pts = new Float32Array(65 * 3);
    for (let i = 0; i <= 64; i++)
      pts.set([Math.cos((i / 64) * 2 * Math.PI), 0, Math.sin((i / 64) * 2 * Math.PI)], 3 * i);
    circle.setAttribute('position', new BufferAttribute(pts, 3));
    const trace = new BufferGeometry();
    trace.setAttribute('position', new BufferAttribute(new Float32Array(TRACE * 3), 3));
    const all = [shaft, tip, axis, axisTip, circle, trace];
    return { shaft, tip, axis, axisTip, circle, trace, dispose: () => all.forEach((g) => g.dispose()) };
  }, []);
  const mats = useDisposable(() => {
    const m = {
      spin: new MeshBasicMaterial({ color: new Color(1.8, 0.5, 1.3) }),
      axis: new MeshBasicMaterial({ color: new Color(0.35, 0.45, 0.8) }),
      circle: new LineBasicMaterial({ color: new Color(0.6, 0.35, 1.2), transparent: true, opacity: 0.6 }),
      trace: new LineBasicMaterial({ color: new Color(0.2, 1.2, 1.6) }),
    };
    return { ...m, dispose: () => Object.values(m).forEach((x) => x.dispose()) };
  }, []);
  const circleLine = useMemo(() => new Line(geo.circle, mats.circle), [geo, mats]);
  const traceLine = useMemo(() => new Line(geo.trace, mats.trace), [geo, mats]);

  const spin = useRef<Group>(null);
  // Magnetization (Mx, My, Mz) in units of the equilibrium value; starts along B₀.
  const m = useMemo(
    () => ({ x: 0, y: 0, z: 1, phase: 0, token: useApplications.getState().pulseToken, tipping: -1 }),
    [],
  );
  useEffect(() => {
    const arr = geo.trace.attributes.position.array as Float32Array;
    for (let i = 0; i < TRACE; i++) arr.set([-2.6 + (5.2 * i) / (TRACE - 1), 0, 0], 3 * i);
  }, [geo]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const st = useApplications.getState();
    const omega = VIS_OMEGA_PER_T * st.field;
    if (st.pulseToken !== m.token) {
      m.token = st.pulseToken;
      m.tipping = 0;
    }
    if (m.tipping >= 0) {
      // 90° RF pulse over 0.35 s: rotate the magnetization down toward the transverse plane.
      m.tipping += dt;
      const a = Math.min(1, m.tipping / 0.35) * (Math.PI / 2);
      const mt = Math.hypot(m.x, m.y);
      const mag = Math.hypot(mt, m.z) || 1;
      m.z = mag * Math.cos(a);
      const t = mag * Math.sin(a);
      m.x = t * Math.cos(m.phase);
      m.y = t * Math.sin(m.phase);
      if (m.tipping >= 0.35) m.tipping = -1;
    } else {
      // Bloch equations in the rotating-frame-free form: precession + relaxation.
      m.phase += omega * dt;
      const mt = Math.hypot(m.x, m.y) * Math.exp(-dt / T2);
      m.z = 1 - (1 - m.z) * Math.exp(-dt / T1);
      m.x = mt * Math.cos(m.phase);
      m.y = mt * Math.sin(m.phase);
    }
    const len = Math.max(Math.hypot(m.x, m.y, m.z), 0.05);
    if (spin.current) {
      dir.set(m.x, m.z, m.y).normalize();
      q.setFromUnitVectors(UP, dir);
      spin.current.quaternion.copy(q);
      spin.current.scale.setScalar(len);
    }
    const mt = Math.hypot(m.x, m.y);
    circleLine.scale.set(mt * L, 1, mt * L);
    circleLine.position.set(0, m.z * L, 0);
    circleLine.visible = mt > 0.02;
    const arr = geo.trace.attributes.position.array as Float32Array;
    // Scroll the trace: shift the y-values one sample left (x-values stay fixed).
    for (let i = 0; i < TRACE - 1; i++) arr[3 * i + 1] = arr[3 * i + 4];
    arr[3 * (TRACE - 1) + 1] = m.x * 0.7;
    geo.trace.attributes.position.needsUpdate = true;
  });

  return (
    <group position={[0, -0.4, 0]} rotation={[0.25, -0.3, 0]}>
      <mesh geometry={geo.axis} material={mats.axis} />
      <mesh geometry={geo.axisTip} material={mats.axis} position={[0, L + 0.5, 0]} />
      <Html position={[0.35, L + 0.55, 0]} center zIndexRange={[5, 0]}>
        <span aria-hidden="true" className="pointer-events-none font-mono text-sm text-slate-300 select-none">
          B₀
        </span>
      </Html>
      <group ref={spin}>
        <mesh geometry={geo.shaft} material={mats.spin} scale={[1, L - 0.3, 1]} />
        <mesh geometry={geo.tip} material={mats.spin} position={[0, L - 0.15, 0]} />
      </group>
      <primitive object={circleLine} />
      <group position={[0, -L + 0.2, 0.6]}>
        <primitive object={traceLine} />
        <Html position={[-2.6, 0.45, 0]} zIndexRange={[5, 0]}>
          <span
            aria-hidden="true"
            className="pointer-events-none font-mono text-xs whitespace-nowrap text-cyan select-none"
          >
            coil signal
          </span>
        </Html>
      </group>
    </group>
  );
}
