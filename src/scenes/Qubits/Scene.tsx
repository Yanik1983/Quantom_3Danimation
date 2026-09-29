import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  ShaderMaterial,
  SphereGeometry,
  SpriteMaterial,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { productDistribution } from '../../physics/qubits';
import { gaussian, mulberry32 } from '../../physics/rng';
import { useTierParams } from '../../state/settings';
import vert from '../../three/shaders/superposition.vert.glsl?raw';
import frag from '../../three/shaders/superposition.frag.glsl?raw';
import { textTexture } from '../../three/textSprite';
import type { SceneProps } from '../registry';
import { MANY, MAX_QUBITS, useQubits } from './store';

/**
 * Each qubit is a glowing cloud split between two glass boxes, "0" and "1": the particle in
 * two places at once. Up to four qubits sit in a row (scaled down as more are added); with two
 * or more, a row of bars behind them shows the chance of every possible result.
 */
const BOX_X = 1.2;
const BOX_W = 1.7;
const BOX_H = 1.5;
const BOX_D = 1.5;
const BOX_Y = BOX_H / 2 + 0.05;
/** Width of one qubit (both boxes) at scale 1. */
const UNIT_W = 2 * BOX_X + BOX_W;
const SCALE = [1, 0.48, 0.32, 0.24] as const;
const GAP = 0.3;
/** Seconds the found particles stay before fresh qubits are prepared in the same mix. */
const HOLD = 2.2;
const BURST = 3.5;

const BARS = 1 << MAX_QUBITS;
const BAR_ROW = 3.6;
const BAR_BASE_Y = 1.3;
const BAR_Z = -1.2;
const BAR_H = 0.9;
const BAR_MAX_W = 0.34;

const CLOUD = new Color(0.35, 1.3, 2.0);
const RIM = new Color(0.55, 0.36, 0.96);
const BAR_ON = new Color(0.08, 0.42, 0.62);
const BAR_HIT = new Color(2.4, 0.5, 1.6);
const BAR_DIM = new Color(0.04, 0.12, 0.2);
const rng = mulberry32(8);
const tmp: [number, number, number] = [0, 0, 0];
const dummy = new Object3D();

/** A random point inside box 0 or 1 (qubit-local coordinates), clustered towards its middle. */
function pointIn(bit: number, out: [number, number, number]) {
  const c = (v: number, h: number) => Math.max(-h, Math.min(h, v));
  out[0] = (bit ? BOX_X : -BOX_X) + c(gaussian(rng) * 0.3, BOX_W / 2 - 0.15);
  out[1] = BOX_Y + c(gaussian(rng) * 0.26, BOX_H / 2 - 0.15);
  out[2] = c(gaussian(rng) * 0.26, BOX_D / 2 - 0.15);
}

/** Cloud points alternate between the boxes, so a shorter draw range keeps both halves. */
function cloudGeometry(n: number): BufferGeometry {
  const pos = new Float32Array(n * 3);
  const side = new Float32Array(n);
  const seed = new Float32Array(n);
  const p: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    side[i] = i % 2;
    pointIn(side[i], p);
    pos.set(p, 3 * i);
    seed[i] = rng();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aSide', new BufferAttribute(side, 1));
  g.setAttribute('aSeed', new BufferAttribute(seed, 1));
  return g;
}

function layout(n: number) {
  const s = SCALE[n - 1];
  const step = UNIT_W * s + GAP;
  return { s, x: (i: number) => (i - (n - 1) / 2) * step, z: n > 1 ? 0.5 : 0 };
}

export default function QubitsScene({ active }: SceneProps) {
  const { particleScale } = useTierParams();
  const dpr = useThree((s) => s.viewport.dpr);
  const points = Math.round(2800 * Math.max(0.5, particleScale));

  const box = useDisposable(() => new BoxGeometry(BOX_W, BOX_H, BOX_D), []);
  const edges = useDisposable(() => new EdgesGeometry(box), [box]);
  const glass = useDisposable(
    () =>
      new MeshBasicMaterial({
        color: new Color('#0d1330'),
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    [],
  );
  // One rim material per box, so the box where a particle was found can light up.
  const rims = useDisposable(() => {
    const list = Array.from({ length: MAX_QUBITS * 2 }, () => new LineBasicMaterial({ color: RIM.clone() }));
    return { list, dispose: () => list.forEach((m) => m.dispose()) };
  }, []);
  const labels = useDisposable(() => {
    const maps = [textTexture('0', '#e6f9ff'), textTexture('1', '#ffd6f0')];
    const mats = maps.map((map) => new SpriteMaterial({ map, transparent: true, depthWrite: false }));
    return {
      mats,
      dispose: () => {
        maps.forEach((m) => m.dispose());
        mats.forEach((m) => m.dispose());
      },
    };
  }, []);

  const cloud = useDisposable(() => cloudGeometry(points), [points]);
  const cloudMat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uTime: { value: 0 },
          uLeft: { value: 0.5 },
          uRight: { value: 0.5 },
          uPixelRatio: { value: 1 },
          uColor: { value: CLOUD },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  // "Measure 100 times": per qubit, one dot per measurement in the box it was found in.
  const bursts = useDisposable(() => {
    const list = Array.from({ length: MAX_QUBITS }, () => {
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array(MANY * 3), 3));
      g.setAttribute('aSide', new BufferAttribute(new Float32Array(MANY), 1));
      g.setAttribute(
        'aSeed',
        new BufferAttribute(
          new Float32Array(MANY).map(() => rng()),
          1,
        ),
      );
      g.setDrawRange(0, 0);
      return g;
    });
    return { list, dispose: () => list.forEach((g) => g.dispose()) };
  }, []);
  const burstMat = useDisposable(() => {
    const m = cloudMat.clone();
    m.uniforms.uColor = { value: new Color(2.2, 1.2, 3.2) };
    return m;
  }, [cloudMat]);

  // A single measurement: one bright dot per qubit.
  const dotGeo = useDisposable(() => new SphereGeometry(0.07, 20, 14), []);
  const dotMat = useDisposable(() => new MeshBasicMaterial({ color: new Color(0.5, 1.5, 2.0) }), []);
  const dots = useRef<(Mesh | null)[]>([]);
  const units = useRef<(Group | null)[]>([]);

  const barGeo = useDisposable(() => new BoxGeometry(1, 1, 0.16).translate(0, 0.5, 0), []);
  const barMat = useDisposable(() => new MeshBasicMaterial({ color: 0xffffff }), []);
  const bars = useRef<InstancedMesh>(null);

  const anim = useRef({
    time: 0,
    look: -Infinity,
    burst: -Infinity,
    lookToken: -1,
    batchToken: -1,
    fade: 1,
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
    a.time += dt;
    const n = active ? st.count : 1;
    const { s, x, z } = layout(n);

    for (let i = 0; i < MAX_QUBITS; i++) {
      const u = units.current[i];
      if (!u) continue;
      u.visible = i < n;
      u.position.set(x(i), 0, z);
      u.scale.setScalar(s);
    }
    cloud.setDrawRange(0, Math.round(points * Math.max(0.3, s)));

    if (st.measureToken !== a.lookToken) {
      if (a.lookToken >= 0 && st.result) {
        a.look = a.time;
        for (let i = 0; i < st.result.length; i++) {
          pointIn(st.result[i], tmp);
          dots.current[i]?.position.set(...tmp);
        }
      }
      a.lookToken = st.measureToken;
    }
    if (st.batchToken !== a.batchToken) {
      if (a.batchToken >= 0 && st.batch) {
        a.burst = a.time;
        for (let q = 0; q < MAX_QUBITS; q++) {
          const g = bursts.list[q];
          if (q >= st.count) {
            g.setDrawRange(0, 0);
            continue;
          }
          const pos = g.attributes.position as BufferAttribute;
          const side = g.attributes.aSide as BufferAttribute;
          for (let k = 0; k < MANY; k++) {
            const bit = (st.batch[k] >> (st.count - 1 - q)) & 1;
            pointIn(bit, tmp);
            pos.setXYZ(k, tmp[0], tmp[1], tmp[2]);
            side.setX(k, bit);
          }
          pos.needsUpdate = true;
          side.needsUpdate = true;
          g.setDrawRange(0, MANY);
        }
      }
      a.batchToken = st.batchToken;
    }

    // After a measurement the clouds are gone until fresh qubits are prepared.
    const sinceLook = a.time - a.look;
    const collapsed = active && st.result !== null && sinceLook < HOLD;
    a.fade += ((collapsed ? 0 : 1) - a.fade) * Math.min(1, dt * (collapsed ? 14 : 2.5));
    const cu = cloudMat.uniforms;
    cu.uTime.value = a.time;
    cu.uPixelRatio.value = dpr * Math.sqrt(s);
    cu.uLeft.value = (1 - st.p1) * 2 * a.fade;
    cu.uRight.value = st.p1 * 2 * a.fade;

    const flash = collapsed ? Math.exp(-sinceLook * 2.5) : 0;
    for (let i = 0; i < MAX_QUBITS; i++) {
      const bit = collapsed && st.result && i < st.result.length ? st.result[i] : -1;
      const d = dots.current[i];
      if (d) {
        d.visible = bit >= 0;
        d.scale.setScalar(1 + 1.2 * flash);
      }
      for (let b = 0; b < 2; b++) {
        rims.list[2 * i + b].color.copy(RIM).multiplyScalar(0.8 + (bit === b ? 1 + 3 * flash : 0));
      }
    }

    const sinceBurst = a.time - a.burst;
    const bu = burstMat.uniforms;
    bu.uTime.value = a.time;
    bu.uPixelRatio.value = dpr * 2.2 * Math.sqrt(s);
    const b =
      active && st.batch && sinceBurst < BURST
        ? Math.min(1, sinceBurst * 6) * Math.min(1, (BURST - sinceBurst) * 2)
        : 0;
    bu.uLeft.value = b;
    bu.uRight.value = b;

    // Bars: the chance of every possible result, shown once there are two or more qubits.
    if (n !== a.distCount || st.p1 !== a.distP1) {
      a.dist = productDistribution(n, st.p1);
      a.distCount = n;
      a.distP1 = st.p1;
    }
    const m = bars.current;
    if (!m) return;
    const count = a.dist.length;
    const shown = n > 1;
    let max = 0;
    for (let k = 0; k < count; k++) max = Math.max(max, a.dist[k]);
    const w = BAR_ROW / count;
    let hit = -1;
    if (collapsed && st.result) {
      hit = 0;
      for (let i = 0; i < st.result.length; i++) hit = (hit << 1) | st.result[i];
    }
    for (let k = 0; k < BARS; k++) {
      const want = shown && k < count ? Math.max(0.02, (a.dist[k] / max) * BAR_H) : 0;
      a.heights[k] += (want - a.heights[k]) * Math.min(1, dt * 8);
      dummy.position.set((k - (count - 1) / 2) * w, BAR_BASE_Y, BAR_Z);
      dummy.scale.set(shown && k < count ? Math.min(BAR_MAX_W, w * 0.7) : 0, Math.max(1e-3, a.heights[k]), 1);
      dummy.updateMatrix();
      m.setMatrixAt(k, dummy.matrix);
      m.setColorAt(k, hit < 0 ? BAR_ON : k === hit ? BAR_HIT : BAR_DIM);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {Array.from({ length: MAX_QUBITS }, (_, q) => (
        <group
          key={q}
          ref={(g) => {
            units.current[q] = g;
          }}
          visible={q === 0}
        >
          {[0, 1].map((bit) => (
            <group key={bit} position={[bit ? BOX_X : -BOX_X, BOX_Y, 0]}>
              <mesh geometry={box} material={glass} />
              <lineSegments geometry={edges} material={rims.list[2 * q + bit]} />
              <sprite material={labels.mats[bit]} position={[0, BOX_H / 2 + 0.32, 0]} scale={0.55} />
            </group>
          ))}
          <points geometry={cloud} material={cloudMat} frustumCulled={false} />
          <points geometry={bursts.list[q]} material={burstMat} frustumCulled={false} />
          <mesh
            ref={(d) => {
              dots.current[q] = d;
            }}
            geometry={dotGeo}
            material={dotMat}
            visible={false}
          />
        </group>
      ))}
      <instancedMesh ref={bars} args={[barGeo, barMat, BARS]} frustumCulled={false} />
    </group>
  );
}
