import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { oxideTunnelling } from '../../physics/applications';
import { mulberry32 } from '../../physics/rng';
import { useApplications } from './store';

const N = 70;
/** World units per nanometre of oxide (the oxide is drawn exaggerated, see readout). */
const OX_SCALE = 0.16;
const CH_Y = 0;
const dummy = new Object3D();

/**
 * MOSFET cross-section: electrons stream through the channel under the gate; a few
 * tunnel up through the gate oxide. The animation's leak rate follows log₁₀ T so it
 * stays visible — the readout gives the real probability.
 */
export function Transistor() {
  const oxide = useApplications((s) => s.oxide);
  const ox = oxide * OX_SCALE;
  const box = useDisposable(() => new BoxGeometry(1, 1, 1), []);
  const dot = useDisposable(() => new SphereGeometry(0.06, 10, 8), []);
  const mats = useDisposable(() => {
    const m = {
      substrate: new MeshBasicMaterial({ color: new Color(0.03, 0.04, 0.09) }),
      doped: new MeshBasicMaterial({ color: new Color(0.03, 0.16, 0.28) }),
      channel: new MeshBasicMaterial({ color: new Color(0.12, 0.08, 0.3) }),
      oxide: new MeshBasicMaterial({
        color: new Color(0.6, 0.7, 1.0),
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
      gate: new MeshBasicMaterial({
        color: new Color(0.3, 0.18, 0.65),
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
      electron: new MeshBasicMaterial({
        color: new Color(0.6, 1.7, 2.2),
        blending: AdditiveBlending,
        transparent: true,
      }),
      leak: new MeshBasicMaterial({
        color: new Color(2.4, 0.6, 1.6),
        blending: AdditiveBlending,
        transparent: true,
      }),
    };
    return { ...m, dispose: () => Object.values(m).forEach((x) => x.dispose()) };
  }, []);

  const electrons = useRef<InstancedMesh>(null);
  const leaks = useRef<InstancedMesh>(null);
  const state = useMemo(() => {
    const rng = mulberry32(12);
    return {
      rng,
      x: Float32Array.from({ length: N }, () => -2 + 4 * rng()),
      z: Float32Array.from({ length: N }, () => -0.8 + 1.6 * rng()),
      leakT: new Float32Array(12).fill(-1),
      leakX: new Float32Array(12),
      leakZ: new Float32Array(12),
      acc: 0,
    };
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = state;
    const T = oxideTunnelling(1, 3.1, useApplications.getState().oxide);
    // Visual leak rate on a log scale: ~6/s at T = 10⁻⁵, none below 10⁻¹⁴.
    const visRate = Math.max(0, (Math.log10(T) + 14) * 0.7);
    s.acc += visRate * dt;
    const inst = electrons.current;
    if (inst) {
      for (let i = 0; i < N; i++) {
        s.x[i] += dt * (1.1 + 0.3 * Math.sin(i));
        if (s.x[i] > 2) s.x[i] -= 4;
        dummy.position.set(s.x[i], CH_Y + 0.05 * Math.sin(i * 7.1 + s.x[i] * 3), s.z[i]);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    }
    const L = leaks.current;
    if (L) {
      while (s.acc >= 1) {
        s.acc -= 1;
        for (let k = 0; k < s.leakT.length; k++) {
          if (s.leakT[k] < 0) {
            s.leakT[k] = 0;
            s.leakX[k] = -1.2 + 2.4 * s.rng();
            s.leakZ[k] = -0.7 + 1.4 * s.rng();
            break;
          }
        }
      }
      const oxNow = useApplications.getState().oxide * OX_SCALE;
      for (let k = 0; k < s.leakT.length; k++) {
        if (s.leakT[k] >= 0) {
          s.leakT[k] += dt;
          const y = CH_Y + 0.15 + s.leakT[k] * 1.2;
          if (y > CH_Y + 0.15 + oxNow + 0.6) s.leakT[k] = -1;
          dummy.position.set(s.leakX[k], y, s.leakZ[k]);
          dummy.scale.setScalar(s.leakT[k] >= 0 ? 1.3 : 0);
        } else dummy.scale.setScalar(0);
        dummy.updateMatrix();
        L.setMatrixAt(k, dummy.matrix);
      }
      L.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={[0, -0.6, 0]} rotation={[0.35, -0.5, 0]}>
      <mesh geometry={box} material={mats.substrate} scale={[5.2, 1.2, 2]} position={[0, CH_Y - 0.72, 0]} />
      <mesh geometry={box} material={mats.doped} scale={[1.1, 0.5, 2]} position={[-2.05, CH_Y - 0.2, 0]} />
      <mesh geometry={box} material={mats.doped} scale={[1.1, 0.5, 2]} position={[2.05, CH_Y - 0.2, 0]} />
      <mesh geometry={box} material={mats.channel} scale={[3, 0.18, 2]} position={[0, CH_Y - 0.06, 0]} />
      <mesh geometry={box} material={mats.oxide} scale={[3, ox, 2]} position={[0, CH_Y + 0.12 + ox / 2, 0]} />
      <mesh
        geometry={box}
        material={mats.gate}
        scale={[3, 0.5, 2]}
        position={[0, CH_Y + 0.12 + ox + 0.25, 0]}
      />
      <instancedMesh ref={electrons} args={[dot, mats.electron, N]} frustumCulled={false} />
      <instancedMesh ref={leaks} args={[dot, mats.leak, 12]} frustumCulled={false} />
      {[
        { t: 'source', p: [-2.05, CH_Y - 0.95, 1.05] },
        { t: 'drain', p: [2.05, CH_Y - 0.95, 1.05] },
        { t: 'gate', p: [0, CH_Y + 0.12 + ox + 0.75, 0] },
        { t: `oxide ${oxide.toFixed(1)} nm`, p: [1.9, CH_Y + 0.12 + ox / 2, 1.05] },
      ].map((l) => (
        <Html key={l.t.slice(0, 5)} position={l.p as [number, number, number]} center zIndexRange={[5, 0]}>
          <span
            aria-hidden="true"
            className="pointer-events-none font-mono text-xs whitespace-nowrap text-slate-300 select-none"
          >
            {l.t}
          </span>
        </Html>
      ))}
    </group>
  );
}
