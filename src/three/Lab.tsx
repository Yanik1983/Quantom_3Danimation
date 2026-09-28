import { Html } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  TorusGeometry,
  Vector2,
} from 'three';
import { COPY } from '../content/experiments';
import { useDisposable } from '../hooks/useDisposable';
import { SCENES } from '../scenes/registry';
import { EXPERIMENTS, useLab, type ExperimentId } from '../state/lab';
import floorVert from './shaders/lab/floor.vert.glsl?raw';
import floorFrag from './shaders/lab/floor.frag.glsl?raw';
import topVert from './shaders/lab/tabletop.vert.glsl?raw';
import topFrag from './shaders/lab/tabletop.frag.glsl?raw';
import pillarVert from './shaders/lab/pillar.vert.glsl?raw';
import pillarFrag from './shaders/lab/pillar.frag.glsl?raw';
import { FLOOR_Y, TABLE_RADIUS, TABLES } from './tables';

const CYAN = new Color('#22e4ff');
const VIOLET = new Color('#8b5cf6');
const PILLARS = 9;

function Floor() {
  const geo = useDisposable(() => new PlaneGeometry(90, 90), []);
  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: floorVert,
        fragmentShader: floorFrag,
        uniforms: { uColor: { value: VIOLET.clone() }, uCenter: { value: new Vector2(0, -3) } },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  return <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} />;
}

/** Soft columns of light around the back of the room. */
function Pillars() {
  const geo = useDisposable(() => new PlaneGeometry(0.28, 11).translate(0, 5.5, 0), []);
  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: pillarVert,
        fragmentShader: pillarFrag,
        uniforms: { uColor: { value: VIOLET.clone().multiplyScalar(0.45) } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    [],
  );
  const items = Array.from({ length: PILLARS }, (_, i) => {
    const a = Math.PI * (0.12 + (0.76 * i) / (PILLARS - 1));
    return { x: -Math.cos(a) * 24, z: -4 - Math.sin(a) * 15, yaw: Math.PI / 2 - a };
  });
  return (
    <>
      {items.map((p, i) => (
        <mesh key={i} geometry={geo} material={mat} position={[p.x, FLOOR_Y, p.z]} rotation={[0, p.yaw, 0]} />
      ))}
    </>
  );
}

function TableLabel({ id, index }: { id: ExperimentId; index: number }) {
  const current = useLab((s) => s.current);
  const visited = useLab((s) => s.visited.includes(id));
  const hovered = useLab((s) => s.hovered === id);
  const narrow = useThree((s) => s.size.width < 700);
  if (current !== null || narrow) return null;
  return (
    <Html position={[0, -0.55, TABLE_RADIUS * 0.9]} center zIndexRange={[5, 0]}>
      <div
        aria-hidden="true"
        onClick={() => useLab.getState().open(id)}
        onPointerEnter={() => useLab.getState().setHovered(id)}
        onPointerLeave={() => useLab.getState().setHovered(null)}
        className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap backdrop-blur-sm transition-colors select-none ${
          hovered ? 'border-cyan/70 bg-cyan/20 text-white' : 'border-white/15 bg-void/70 text-slate-100'
        }`}
      >
        <span className="mr-1.5 font-display text-cyan">{index + 1}</span>
        {COPY[id].name}
        {visited && <span className="ml-1.5 text-cyan">✓</span>}
      </div>
    </Html>
  );
}

function Table({ id, index }: { id: ExperimentId; index: number }) {
  const pose = TABLES[id];
  const { Scene } = SCENES[id];
  const active = useLab((s) => s.current === id);

  const body = useDisposable(
    () =>
      new CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS * 0.84, -FLOOR_Y, 64, 1, true).translate(
        0,
        FLOOR_Y / 2,
        0,
      ),
    [],
  );
  const top = useDisposable(() => new CircleGeometry(TABLE_RADIUS, 64), []);
  const rim = useDisposable(() => new TorusGeometry(TABLE_RADIUS, 0.028, 8, 128), []);
  const foot = useDisposable(() => new TorusGeometry(TABLE_RADIUS * 0.84, 0.02, 8, 128), []);
  const bodyMat = useDisposable(() => new MeshBasicMaterial({ color: new Color('#080a14') }), []);
  const topMat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: topVert,
        fragmentShader: topFrag,
        uniforms: { uColor: { value: CYAN.clone() }, uRadius: { value: TABLE_RADIUS }, uGlow: { value: 1 } },
      }),
    [],
  );
  const rimMat = useDisposable(() => new MeshBasicMaterial({ color: CYAN.clone() }), []);
  const glow = useRef(0.6);

  useFrame((_, dt) => {
    const hovered = useLab.getState().hovered === id;
    const want = active ? 0.45 : hovered ? 1.6 : 0.6;
    glow.current += (want - glow.current) * Math.min(1, dt * 8);
    rimMat.color.copy(CYAN).multiplyScalar(glow.current);
    topMat.uniforms.uGlow.value = 0.5 + glow.current * 0.6;
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    useLab.getState().setHovered(id);
    document.body.style.cursor = 'pointer';
  };
  const onOut = () => {
    if (useLab.getState().hovered === id) useLab.getState().setHovered(null);
    document.body.style.cursor = '';
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = '';
    if (!active) useLab.getState().open(id);
  };

  return (
    <group position={pose.position as [number, number, number]} rotation={[0, pose.yaw, 0]}>
      <group onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        <mesh geometry={body} material={bodyMat} />
        <mesh geometry={top} material={topMat} rotation={[-Math.PI / 2, 0, 0]} />
      </group>
      <mesh geometry={rim} material={rimMat} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh
        geometry={foot}
        material={rimMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y + 0.02, 0]}
      />
      <Suspense fallback={null}>
        <Scene active={active} />
      </Suspense>
      <TableLabel id={id} index={index} />
    </group>
  );
}

/** The glowing lab: a floor grid, light columns, and one instrument table per experiment. */
export function Lab() {
  return (
    <>
      <Floor />
      <Pillars />
      {EXPERIMENTS.map((id, i) => (
        <Table key={id} id={id} index={i} />
      ))}
    </>
  );
}
