import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { gaussian, mulberry32 } from '../../physics/rng';
import { useTierParams } from '../../state/settings';
import vert from '../../three/shaders/superposition.vert.glsl?raw';
import frag from '../../three/shaders/superposition.frag.glsl?raw';
import type { SceneProps } from '../registry';
import { LOOKS, useSuperposition, type Box } from './store';

const BOX_X = 1.2;
const BOX_W = 1.7;
const BOX_H = 1.5;
const BOX_D = 1.5;
const BOX_Y = BOX_H / 2 + 0.05;
/** Seconds the found particle stays before a fresh one is prepared in the same mix. */
const HOLD = 2.2;
const BURST = 3.5;

const CLOUD = new Color(0.35, 1.3, 2.0);
const rng = mulberry32(8);
/** Scratch point for the frame loop (no per-frame allocation). */
const tmp: [number, number, number] = [0, 0, 0];

/** A random point inside a box, clustered towards its middle. */
function pointIn(side: Box, out: [number, number, number]) {
  const c = (v: number, h: number) => Math.max(-h, Math.min(h, v));
  out[0] = (side === 'left' ? -BOX_X : BOX_X) + c(gaussian(rng) * 0.3, BOX_W / 2 - 0.15);
  out[1] = BOX_Y + c(gaussian(rng) * 0.26, BOX_H / 2 - 0.15);
  out[2] = c(gaussian(rng) * 0.26, BOX_D / 2 - 0.15);
}

function cloudGeometry(perBox: number): BufferGeometry {
  const n = perBox * 2;
  const pos = new Float32Array(n * 3);
  const side = new Float32Array(n);
  const seed = new Float32Array(n);
  const p: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    side[i] = i < perBox ? 0 : 1;
    pointIn(side[i] ? 'right' : 'left', p);
    pos.set(p, 3 * i);
    seed[i] = rng();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aSide', new BufferAttribute(side, 1));
  g.setAttribute('aSeed', new BufferAttribute(seed, 1));
  return g;
}

export default function SuperpositionScene({ active }: SceneProps) {
  const { particleScale } = useTierParams();
  const dpr = useThree((s) => s.viewport.dpr);
  const perBox = Math.round(1400 * Math.max(0.5, particleScale));

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
  const rimL = useDisposable(() => new LineBasicMaterial({ color: new Color('#8b5cf6') }), []);
  const rimR = useDisposable(() => new LineBasicMaterial({ color: new Color('#8b5cf6') }), []);

  const cloud = useDisposable(() => cloudGeometry(perBox), [perBox]);
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

  // The found particle: one bright dot.
  const dotGeo = useDisposable(() => new SphereGeometry(0.07, 20, 14), []);
  const dotMat = useDisposable(() => new MeshBasicMaterial({ color: new Color(0.5, 1.5, 2.0) }), []);
  const dot = useRef<Mesh>(null);

  // "Look 100 times": 100 dots, one per freshly prepared particle, in the box where each was found.
  const burstGeo = useDisposable(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(LOOKS * 3), 3));
    g.setAttribute('aSide', new BufferAttribute(new Float32Array(LOOKS), 1));
    g.setAttribute(
      'aSeed',
      new BufferAttribute(
        new Float32Array(LOOKS).map(() => rng()),
        1,
      ),
    );
    g.setDrawRange(0, 0);
    return g;
  }, []);
  const burstMat = useDisposable(() => {
    const m = cloudMat.clone();
    m.uniforms.uColor = { value: new Color(2.2, 1.2, 3.2) };
    return m;
  }, [cloudMat]);

  const anim = useRef({ look: -Infinity, burst: -Infinity, time: 0, lookToken: -1, tallyToken: -1, fade: 1 });

  useEffect(() => {
    if (active) useSuperposition.getState().reset();
  }, [active]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const a = anim.current;
    const st = useSuperposition.getState();
    a.time += dt;

    if (st.lookToken !== a.lookToken) {
      if (a.lookToken >= 0 && st.found) {
        a.look = a.time;
        const p = tmp;
        pointIn(st.found, p);
        dot.current?.position.set(...p);
      }
      a.lookToken = st.lookToken;
    }
    if (st.tallyToken !== a.tallyToken) {
      if (a.tallyToken >= 0 && st.tally) {
        a.burst = a.time;
        const pos = burstGeo.attributes.position as BufferAttribute;
        const side = burstGeo.attributes.aSide as BufferAttribute;
        const p = tmp;
        for (let i = 0; i < LOOKS; i++) {
          const s: Box = i < st.tally.left ? 'left' : 'right';
          pointIn(s, p);
          pos.setXYZ(i, p[0], p[1], p[2]);
          side.setX(i, s === 'left' ? 0 : 1);
        }
        pos.needsUpdate = true;
        side.needsUpdate = true;
        burstGeo.setDrawRange(0, LOOKS);
      }
      a.tallyToken = st.tallyToken;
    }

    // After a look the cloud is gone until a fresh particle is prepared.
    const sinceLook = a.time - a.look;
    const collapsed = active && sinceLook < HOLD;
    a.fade += ((collapsed ? 0 : 1) - a.fade) * Math.min(1, dt * (collapsed ? 14 : 2.5));
    const u = cloudMat.uniforms;
    u.uTime.value = a.time;
    u.uPixelRatio.value = dpr;
    u.uLeft.value = (1 - st.pRight) * 2 * a.fade;
    u.uRight.value = st.pRight * 2 * a.fade;

    const flash = collapsed ? Math.exp(-sinceLook * 2.5) : 0;
    if (dot.current) {
      dot.current.visible = collapsed;
      dot.current.scale.setScalar(1 + 1.2 * flash);
    }
    const lit = (side: Box) => (collapsed && st.found === side ? 1 + 3 * flash : 0);
    rimL.color.setRGB(0.55, 0.36, 0.96).multiplyScalar(0.8 + lit('left'));
    rimR.color.setRGB(0.55, 0.36, 0.96).multiplyScalar(0.8 + lit('right'));

    const sinceBurst = a.time - a.burst;
    const bu = burstMat.uniforms;
    bu.uTime.value = a.time;
    bu.uPixelRatio.value = dpr * 2.2;
    const b =
      active && sinceBurst < BURST ? Math.min(1, sinceBurst * 6) * Math.min(1, (BURST - sinceBurst) * 2) : 0;
    bu.uLeft.value = b;
    bu.uRight.value = b;
  });

  return (
    <group>
      {(['left', 'right'] as const).map((side) => (
        <group key={side} position={[side === 'left' ? -BOX_X : BOX_X, BOX_Y, 0]}>
          <mesh geometry={box} material={glass} />
          <lineSegments geometry={edges} material={side === 'left' ? rimL : rimR} />
        </group>
      ))}
      <points geometry={cloud} material={cloudMat} frustumCulled={false} />
      <points geometry={burstGeo} material={burstMat} frustumCulled={false} />
      <mesh ref={dot} geometry={dotGeo} material={dotMat} visible={false} />
    </group>
  );
}
