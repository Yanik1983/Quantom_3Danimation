import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  Color,
  CylinderGeometry,
  DataTexture,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  HalfFloatType,
  LinearFilter,
  MeshBasicMaterial,
  PlaneGeometry,
  RedFormat,
  ShaderMaterial,
  Sphere,
  SphereGeometry,
  Vector3,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { selectReducedMotion, useSettings, useTier } from '../../state/settings';
import cloudVert from '../../three/shaders/orbitals/cloud.vert.glsl?raw';
import cloudFrag from '../../three/shaders/orbitals/cloud.frag.glsl?raw';
import sliceVert from '../../three/shaders/orbitals/slice.vert.glsl?raw';
import sliceFrag from '../../three/shaders/orbitals/slice.frag.glsl?raw';
import type { OrbitalRequest, OrbitalResponse } from '../../workers/orbitalProtocol';
import type { SceneProps } from '../registry';
import { useOrbitals } from './store';

const COUNT = { low: 18_000, medium: 40_000, high: 70_000 } as const;
/** World radius that the 95 % probability sphere is scaled to. */
const CLOUD_RADIUS = 3.4;
const SLICE_RES = 160;
const PLANE_MARGIN = 1.15;

export default function OrbitalsScene({ active }: SceneProps) {
  const tier = useTier();
  const count = COUNT[tier];
  const { n, l, m, cut } = useOrbitals();
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useDisposable(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(3 * count), 3).setUsage(DynamicDrawUsage),
    );
    g.setAttribute('aSign', new BufferAttribute(new Float32Array(count), 1).setUsage(DynamicDrawUsage));
    g.boundingSphere = new Sphere(new Vector3(), CLOUD_RADIUS * 1.6);
    g.setDrawRange(0, 0);
    return g;
  }, [count]);
  const material = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: cloudVert,
        fragmentShader: cloudFrag,
        uniforms: {
          uScale: { value: 1 },
          uGrow: { value: 0 },
          uCut: { value: 100 },
          uSize: { value: tier === 'low' ? 3.4 : tier === 'medium' ? 2.7 : 2.3 },
          uPixelRatio: { value: 1 },
          uAlpha: { value: tier === 'low' ? 0.6 : 0.45 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [tier],
  );

  const sliceData = useMemo(() => new Uint16Array(SLICE_RES * SLICE_RES), []);
  const sliceTex = useDisposable(() => {
    const t = new DataTexture(sliceData, SLICE_RES, SLICE_RES, RedFormat, HalfFloatType);
    t.minFilter = t.magFilter = LinearFilter;
    t.wrapS = t.wrapT = ClampToEdgeWrapping;
    t.needsUpdate = true;
    return t;
  }, [sliceData]);
  const sliceGeo = useDisposable(() => new PlaneGeometry(1, 1), []);
  const sliceMat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: sliceVert,
        fragmentShader: sliceFrag,
        uniforms: { uPsi: { value: sliceTex }, uOpacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    [sliceTex],
  );
  const nucleusGeo = useDisposable(() => new SphereGeometry(0.06, 16, 8), []);
  const axisGeo = useDisposable(() => new CylinderGeometry(0.006, 0.006, CLOUD_RADIUS * 2.3, 6), []);
  const hitGeo = useDisposable(() => new SphereGeometry(CLOUD_RADIUS * 1.05, 16, 12), []);
  const mats = useDisposable(() => {
    const nucleus = new MeshBasicMaterial({ color: new Color(2.5, 2.2, 1.8) });
    const axis = new MeshBasicMaterial({
      color: new Color(0.3, 0.35, 0.6),
      transparent: true,
      opacity: 0.22,
    });
    const hidden = new MeshBasicMaterial({ visible: false });
    return { nucleus, axis, hidden, dispose: () => [nucleus, axis, hidden].forEach((x) => x.dispose()) };
  }, []);

  const group = useRef<Group>(null);
  const slice = useRef<Group>(null);
  const anim = useRef({ grow: 0, scale: 1, targetScale: 1, r95: 0, rotY: 0, rotX: 0.25, sliceFade: 0 });

  // Worker: at most one request of each kind in flight; newer requests supersede older ones.
  const worker = useRef<Worker | null>(null);
  const ids = useRef({ sample: 0, slice: 0 });
  useEffect(() => {
    const w = new Worker(new URL('../../workers/orbital.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.onmessage = (e: MessageEvent<OrbitalResponse>) => {
      const msg = e.data;
      if (msg.type === 'sample') {
        if (msg.id !== ids.current.sample) return;
        const pos = geometry.attributes.position as BufferAttribute;
        const sign = geometry.attributes.aSign as BufferAttribute;
        (pos.array as Float32Array).set(msg.positions);
        (sign.array as Float32Array).set(msg.signs);
        pos.needsUpdate = true;
        sign.needsUpdate = true;
        geometry.setDrawRange(0, msg.signs.length);
        const a = anim.current;
        a.r95 = msg.r95;
        a.targetScale = CLOUD_RADIUS / msg.r95;
        a.scale = a.targetScale;
        a.grow = 0;
        useOrbitals.setState({ r95: msg.r95 });
      } else {
        if (msg.id !== ids.current.slice) return;
        sliceData.set(msg.data);
        sliceTex.needsUpdate = true;
      }
    };
    return () => {
      w.terminate();
      worker.current = null;
    };
  }, [geometry, sliceData, sliceTex]);

  useEffect(() => {
    const req: OrbitalRequest = {
      type: 'sample',
      id: ++ids.current.sample,
      n,
      l,
      m,
      count,
      seed: (n * 131 + l * 17 + m + 7) * 7919,
    };
    worker.current?.postMessage(req);
  }, [n, l, m, count, geometry]);

  const r95 = useOrbitals((s) => s.r95);
  useEffect(() => {
    if (!r95 || cut >= 1) return;
    const extent = r95 * PLANE_MARGIN;
    const req: OrbitalRequest = {
      type: 'slice',
      id: ++ids.current.slice,
      n,
      l,
      m,
      // World z = −y (atomic units scaled); the plane sits at world z = cut · R.
      y0: -cut * r95,
      extent,
      res: SLICE_RES,
    };
    worker.current?.postMessage(req);
  }, [n, l, m, cut, r95]);

  const drag = useRef<{ x: number; y: number } | null>(null);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const a = anim.current;
    const st = useOrbitals.getState();
    const reduced = selectReducedMotion(useSettings.getState());
    a.grow = reduced ? 1 : Math.min(1, a.grow + dt / 0.7);
    const eased = 1 - Math.pow(1 - a.grow, 3);
    const u = material.uniforms;
    u.uScale.value = a.scale;
    u.uGrow.value = eased;
    u.uPixelRatio.value = dpr;
    u.uCut.value = st.cut >= 1 ? 100 : st.cut * CLOUD_RADIUS;

    a.sliceFade += ((st.cut < 1 ? 1 : 0) - a.sliceFade) * Math.min(1, dt * 6);
    sliceMat.uniforms.uOpacity.value = a.sliceFade;
    if (slice.current) {
      slice.current.visible = a.sliceFade > 0.01;
      const size = 2 * CLOUD_RADIUS * PLANE_MARGIN;
      slice.current.scale.set(size, size, 1);
      slice.current.position.set(0, 0, Math.min(st.cut, 1) * CLOUD_RADIUS);
    }

    if (group.current) {
      if (st.autoRotate && active && !reduced && !drag.current) a.rotY += dt * 0.18;
      group.current.rotation.set(a.rotX, a.rotY, 0);
    }
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'grabbing';
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    const a = anim.current;
    a.rotY += (e.clientX - drag.current.x) * 0.008;
    a.rotX = Math.max(-1.2, Math.min(1.2, a.rotX + (e.clientY - drag.current.y) * 0.006));
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    drag.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
    document.body.style.cursor = '';
  };

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} />
      <mesh geometry={nucleusGeo} material={mats.nucleus} />
      <mesh geometry={axisGeo} material={mats.axis} />
      <group ref={slice}>
        <mesh geometry={sliceGeo} material={sliceMat} />
      </group>
      <mesh
        geometry={hitGeo}
        material={mats.hidden}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerOver={() => !drag.current && (document.body.style.cursor = 'grab')}
        onPointerOut={() => !drag.current && (document.body.style.cursor = '')}
      />
    </group>
  );
}
