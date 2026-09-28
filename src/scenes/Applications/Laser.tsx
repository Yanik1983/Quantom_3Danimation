import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { mulberry32 } from '../../physics/rng';
import { useApplications } from './store';

const ATOMS = 20;
const MAX_PHOTONS = 360;
const MIRROR_X = 3;
const OUT_X = 7;
const SPEED = 4;
/** Output-coupler transmission. */
const OUTPUT_T = 0.08;
const dummy = new Object3D();

export function beamColor(nm: number, out: Color): Color {
  if (nm < 450) return out.setRGB(0.55, 0.15, 1.0);
  if (nm < 560) return out.setRGB(0.15, 1.0, 0.25);
  return out.setRGB(1.0, 0.12, 0.08);
}

/**
 * Stimulated emission in a cavity (illustration, not to scale): pumped atoms sit excited;
 * a photon passing an excited atom can trigger an identical twin travelling the same way.
 * Mirrors keep the photons bouncing, so the cascade builds a beam that leaks out through
 * the partly transparent right-hand mirror.
 */
export function Laser() {
  const wavelength = useApplications((s) => s.wavelength);
  const geo = useDisposable(() => {
    const atom = new SphereGeometry(0.11, 16, 12);
    const photon = new BoxGeometry(0.28, 0.035, 0.035);
    const mirror = new CylinderGeometry(0.75, 0.75, 0.06, 40);
    const tube = new CylinderGeometry(0.62, 0.62, 2 * MIRROR_X, 40, 1, true);
    const all = [atom, photon, mirror, tube];
    return { atom, photon, mirror, tube, dispose: () => all.forEach((g) => g.dispose()) };
  }, []);
  const mats = useDisposable(() => {
    const m = {
      atom: new MeshBasicMaterial({ color: new Color(1, 1, 1) }),
      photon: new MeshBasicMaterial({ color: new Color(), blending: AdditiveBlending, transparent: true }),
      mirror: new MeshBasicMaterial({ color: new Color(0.22, 0.24, 0.4) }),
      coupler: new MeshBasicMaterial({ color: new Color(0.25, 0.28, 0.5), transparent: true, opacity: 0.45 }),
      tube: new MeshBasicMaterial({
        color: new Color(0.3, 0.3, 0.7),
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      }),
    };
    return { ...m, dispose: () => Object.values(m).forEach((x) => x.dispose()) };
  }, []);

  const atomsRef = useRef<InstancedMesh>(null);
  const photonsRef = useRef<InstancedMesh>(null);
  const sim = useMemo(() => {
    const rng = mulberry32(77);
    return {
      rng,
      ax: Float32Array.from({ length: ATOMS }, (_, i) => -2.6 + (5.2 * i) / (ATOMS - 1)),
      ay: Float32Array.from({ length: ATOMS }, () => (rng() - 0.5) * 0.5),
      excited: new Uint8Array(ATOMS),
      px: new Float32Array(MAX_PHOTONS),
      py: new Float32Array(MAX_PHOTONS),
      pd: new Int8Array(MAX_PHOTONS),
      /** 0 = free slot, 1 = in cavity, 2 = output beam */
      pState: new Uint8Array(MAX_PHOTONS),
      outCount: 0,
      outClock: 0,
      glow: new Color(),
      dim: new Color(0.12, 0.12, 0.22),
    };
  }, []);

  const spawn = (x: number, y: number, d: number) => {
    for (let k = 0; k < MAX_PHOTONS; k++) {
      if (sim.pState[k] === 0) {
        sim.pState[k] = 1;
        sim.px[k] = x;
        sim.py[k] = y;
        sim.pd[k] = d;
        return;
      }
    }
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useApplications.getState();
    const s = sim;
    beamColor(st.wavelength, s.glow);
    mats.photon.color.copy(s.glow).multiplyScalar(1.8);
    for (let i = 0; i < ATOMS; i++) {
      if (!s.excited[i] && s.rng() < st.pump * 2.5 * dt) s.excited[i] = 1; // pumping
      if (s.excited[i] && s.rng() < 0.25 * dt) {
        s.excited[i] = 0; // spontaneous emission; only a few photons happen to go along the axis
        if (s.rng() < 0.3) spawn(s.ax[i], s.ay[i], s.rng() < 0.5 ? -1 : 1);
      }
    }
    for (let k = 0; k < MAX_PHOTONS; k++) {
      if (s.pState[k] === 0) continue;
      const x0 = s.px[k];
      const x1 = x0 + s.pd[k] * SPEED * dt;
      s.px[k] = x1;
      if (s.pState[k] === 2) {
        if (x1 > OUT_X) s.pState[k] = 0;
        continue;
      }
      // Stimulated emission from atoms the photon passes this frame.
      for (let i = 0; i < ATOMS; i++) {
        if (s.excited[i] && (s.ax[i] - x0) * (s.ax[i] - x1) <= 0 && s.rng() < 0.55) {
          s.excited[i] = 0;
          spawn(s.ax[i], s.py[k] + (s.rng() - 0.5) * 0.08, s.pd[k]);
        }
      }
      if (x1 <= -MIRROR_X) {
        s.pd[k] = 1;
        s.px[k] = -MIRROR_X;
      } else if (x1 >= MIRROR_X) {
        if (s.rng() < OUTPUT_T) {
          s.pState[k] = 2;
          s.outCount++;
        } else {
          s.pd[k] = -1;
          s.px[k] = MIRROR_X;
        }
      }
    }
    s.outClock += dt;
    if (s.outClock > 0.5) {
      useApplications.setState({ laserOutput: s.outCount / s.outClock });
      s.outCount = 0;
      s.outClock = 0;
    }
    const A = atomsRef.current;
    if (A) {
      for (let i = 0; i < ATOMS; i++) {
        dummy.position.set(s.ax[i], s.ay[i], 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        A.setMatrixAt(i, dummy.matrix);
        A.setColorAt(i, s.excited[i] ? s.glow : s.dim);
      }
      A.instanceMatrix.needsUpdate = true;
      if (A.instanceColor) A.instanceColor.needsUpdate = true;
    }
    const P = photonsRef.current;
    if (P) {
      for (let k = 0; k < MAX_PHOTONS; k++) {
        dummy.position.set(s.px[k], s.py[k], 0);
        dummy.scale.setScalar(s.pState[k] ? 1 : 0);
        dummy.updateMatrix();
        P.setMatrixAt(k, dummy.matrix);
      }
      P.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={[-1.2, 0, 0]} rotation={[0.3, -0.35, 0]}>
      <mesh geometry={geo.tube} material={mats.tube} rotation={[0, 0, Math.PI / 2]} />
      <mesh
        geometry={geo.mirror}
        material={mats.mirror}
        position={[-MIRROR_X - 0.05, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <mesh
        geometry={geo.mirror}
        material={mats.coupler}
        position={[MIRROR_X + 0.05, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
      />
      <instancedMesh ref={atomsRef} args={[geo.atom, mats.atom, ATOMS]} frustumCulled={false} />
      <instancedMesh ref={photonsRef} args={[geo.photon, mats.photon, MAX_PHOTONS]} frustumCulled={false} />
      <Html position={[0, -1.05, 0]} center zIndexRange={[5, 0]}>
        <span
          aria-hidden="true"
          className="pointer-events-none font-mono text-xs whitespace-nowrap text-slate-400 select-none"
        >
          {wavelength.toFixed(0)} nm · illustration, not to scale
        </span>
      </Html>
    </group>
  );
}
