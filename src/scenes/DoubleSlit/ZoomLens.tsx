import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  MeshBasicMaterial,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { gaussian, mulberry32, type Rng } from '../../physics/rng';
import lensVert from '../../three/shaders/doubleSlit/lens.vert.glsl?raw';
import lensFrag from '../../three/shaders/doubleSlit/lens.frag.glsl?raw';
import { useDoubleSlit } from './store';
import { STAGE_CENTERS, STAGE_GROWTH } from './zoom';

const SAND = new Color('#f0c987');
const SILICON = new Color('#8b5cf6');
const OXYGEN = new Color('#22e4ff');
const NUCLEUS = new Color('#ff3dbb');
const ELECTRON = new Color('#7fdcff');

interface Pt {
  x: number;
  y: number;
  z: number;
  stage: number;
  size: number;
  color: Color;
  gain: number;
}

/** Grain of sand: points on a lumpy, rounded rock surface. */
function sandGrain(rng: Rng, out: Pt[]) {
  const bumps = Array.from({ length: 7 }, () => {
    const v = new Vector3(gaussian(rng), gaussian(rng), gaussian(rng)).normalize();
    return { v, k: 2 + rng() * 4, a: 0.05 + rng() * 0.08, ph: rng() * 6.28 };
  });
  const d = new Vector3();
  for (let i = 0; i < 2600; i++) {
    d.set(gaussian(rng), gaussian(rng), gaussian(rng)).normalize();
    let r = 0.62;
    for (const b of bumps) r += b.a * Math.sin(b.k * d.dot(b.v) + b.ph);
    d.multiplyScalar(r);
    d.x *= 1.15;
    out.push({ x: d.x, y: d.y, z: d.z, stage: 0, size: 1.1, color: SAND, gain: 0.5 + rng() * 0.7 });
  }
}

/** A slab of the crystal: a square array of atoms (two kinds, like the silicon and oxygen in quartz). */
function crystal(out: Pt[]) {
  const a = 0.3;
  for (let i = -6; i <= 6; i++) {
    for (let j = -6; j <= 6; j++) {
      const si = (i + j) % 2 === 0;
      out.push({
        x: i * a,
        y: j * a,
        z: 0,
        stage: 1,
        size: si ? 5.5 : 3.8,
        color: si ? SILICON : OXYGEN,
        gain: 1,
      });
    }
  }
}

/**
 * One hydrogen atom: the nucleus and the electron's 1s probability cloud. Radii are sampled
 * from the exact radial density P(r) = 4r²e^{−2r} (Bohr radii), i.e. a Gamma(3, ½) variate.
 */
function atom(rng: Rng, out: Pt[]) {
  const a0 = 0.26;
  const d = new Vector3();
  out.push({ x: 0, y: 0, z: 0, stage: 2, size: 5, color: NUCLEUS, gain: 2 });
  for (let i = 0; i < 2200; i++) {
    const r = -0.5 * Math.log((1 - rng()) * (1 - rng()) * (1 - rng()));
    d.set(gaussian(rng), gaussian(rng), gaussian(rng))
      .normalize()
      .multiplyScalar(r * a0);
    out.push({ x: d.x, y: d.y, z: d.z, stage: 2, size: 1.3, color: ELECTRON, gain: 0.6 });
  }
}

function buildLensPoints(): BufferGeometry {
  const rng = mulberry32(31);
  const pts: Pt[] = [];
  sandGrain(rng, pts);
  crystal(pts);
  atom(rng, pts);
  const pos = new Float32Array(pts.length * 3);
  const stage = new Float32Array(pts.length);
  const size = new Float32Array(pts.length);
  const color = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => {
    pos.set([p.x, p.y, p.z], 3 * i);
    stage[i] = p.stage;
    size[i] = p.size;
    color.set([p.color.r * p.gain, p.color.g * p.gain, p.color.b * p.gain], 3 * i);
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aStage', new BufferAttribute(stage, 1));
  g.setAttribute('aSize', new BufferAttribute(size, 1));
  g.setAttribute('aColor', new BufferAttribute(color, 3));
  return g;
}

/** A floating holographic lens (radius 1, local units) that zooms from a grain of sand to one atom. */
export function ZoomLens() {
  const dpr = useThree((s) => s.viewport.dpr);
  const points = useDisposable(buildLensPoints, []);
  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: lensVert,
        fragmentShader: lensFrag,
        uniforms: {
          uZoom: { value: 0 },
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uCenters: { value: new Vector3(...STAGE_CENTERS) },
          uGrowth: { value: STAGE_GROWTH },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  const ring = useDisposable(() => new TorusGeometry(1.04, 0.035, 10, 96), []);
  const disc = useDisposable(() => new CircleGeometry(1.04, 64), []);
  const ringMat = useDisposable(() => new MeshBasicMaterial({ color: new Color(0.4, 1.6, 2.2) }), []);
  const discMat = useDisposable(
    () =>
      new MeshBasicMaterial({
        color: new Color('#070a16'),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    [],
  );

  useFrame((_, dt) => {
    const u = mat.uniforms;
    // Ease towards the slider value so dragging feels like a smooth zoom.
    u.uZoom.value += (useDoubleSlit.getState().zoom - u.uZoom.value) * Math.min(1, dt * 6);
    u.uTime.value += Math.min(dt, 0.1);
    u.uPixelRatio.value = dpr;
  });

  return (
    <group>
      <mesh geometry={disc} material={discMat} position={[0, 0, -0.3]} />
      <mesh geometry={ring} material={ringMat} />
      <points geometry={points} material={mat} frustumCulled={false} />
    </group>
  );
}
