import { Html } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useDisposable } from '../../hooks/useDisposable';
import floorVert from '../shaders/lab/floor.vert.glsl?raw';
import floorFrag from '../shaders/lab/floor.frag.glsl?raw';
import wallVert from '../shaders/lab/wall.vert.glsl?raw';
import wallFrag from '../shaders/lab/wall.frag.glsl?raw';
import screenVert from '../shaders/lab/screen.vert.glsl?raw';
import screenFrag from '../shaders/lab/screen.frag.glsl?raw';
import ledVert from '../shaders/lab/led.vert.glsl?raw';
import ledFrag from '../shaders/lab/led.frag.glsl?raw';
import { useUi } from '../../content/i18n';
import { useLab } from '../../state/lab';
import { useTier } from '../../state/settings';
import { buildLabRoom, MATERIALS, ROOM, type MaterialName } from './build';

const CYAN = new Color('#22e4ff');
const MAGENTA = new Color('#ff3dbb');

function Floor() {
  const geo = useDisposable(
    () => new PlaneGeometry(90, 90).rotateX(-Math.PI / 2).translate(0, ROOM.floorY, 0),
    [],
  );
  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: floorVert,
        fragmentShader: floorFrag,
        uniforms: { uColor: { value: CYAN.clone() }, uCenter: { value: new Vector2(0, -3) } },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  return <mesh geometry={geo} material={mat} renderOrder={-1} />;
}

function Walls() {
  const geo = useDisposable(() => {
    const h = ROOM.wallTop - ROOM.floorY;
    const cy = ROOM.floorY + h / 2;
    const depth = 40;
    const back = new PlaneGeometry(2 * ROOM.sideX, h).translate(0, cy, ROOM.backZ);
    const left = new PlaneGeometry(depth, h)
      .rotateY(Math.PI / 2)
      .translate(-ROOM.sideX, cy, ROOM.backZ + depth / 2);
    const right = new PlaneGeometry(depth, h)
      .rotateY(-Math.PI / 2)
      .translate(ROOM.sideX, cy, ROOM.backZ + depth / 2);
    const merged = mergeGeometries([back, left, right]);
    [back, left, right].forEach((g) => g.dispose());
    if (!merged) throw new Error('Wall geometry failed to merge');
    return merged;
  }, []);
  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: wallVert,
        fragmentShader: wallFrag,
        uniforms: { uAccent: { value: CYAN.clone() }, uFloorY: { value: ROOM.floorY } },
      }),
    [],
  );
  return <mesh geometry={geo} material={mat} />;
}

/**
 * A dark lab baked into an environment map for the metal reflections: rows of ceiling light
 * panels, a warm light on one side and the cyan skirting strip around the walls.
 */
function bakeEnvironment(gl: WebGLRenderer): WebGLRenderTarget {
  const scene = new Scene();
  const disposables: { dispose(): void }[] = [];
  const add = (
    geo: BufferGeometry,
    color: Color,
    at: [number, number, number],
    rot: [number, number, number] = [0, 0, 0],
  ) => {
    const mat = new MeshBasicMaterial({ color, side: DoubleSide });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(...at);
    mesh.rotation.set(...rot);
    scene.add(mesh);
    disposables.push(geo, mat);
  };
  add(new BoxGeometry(40, 14, 40), new Color(0.03, 0.034, 0.045), [0, 6, 0]);
  // Ceiling: a grid of bright light panels.
  for (let i = -2; i <= 2; i++)
    for (let j = -2; j <= 2; j++)
      add(new PlaneGeometry(5, 2), new Color(5, 5.1, 5.4), [i * 7, 12.9, j * 7], [Math.PI / 2, 0, 0]);
  // Warm and cool fill from the side walls.
  add(new PlaneGeometry(14, 8), new Color(3.2, 2.3, 1.4), [19.9, 6, 2], [0, -Math.PI / 2, 0]);
  add(new PlaneGeometry(12, 7), new Color(1.1, 1.4, 2.2), [-19.9, 5, -4], [0, Math.PI / 2, 0]);
  add(new PlaneGeometry(16, 6), new Color(1.6, 1.6, 1.8), [0, 5, 19.9], [0, Math.PI, 0]);
  for (const [x, z, ry] of [
    [0, -19.9, 0],
    [0, 19.9, Math.PI],
    [-19.9, 0, Math.PI / 2],
    [19.9, 0, -Math.PI / 2],
  ] as const)
    add(new PlaneGeometry(40, 0.25), CYAN.clone().multiplyScalar(2), [x, 0.2, z], [0, ry, 0]);
  const pmrem = new PMREMGenerator(gl);
  const target = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  disposables.forEach((d) => d.dispose());
  return target;
}

/** Physically based materials for the lab hardware; vertex colours tint individual parts. */
const MATERIAL_PARAMS: Record<
  MaterialName,
  { color: string; metalness: number; roughness: number; env?: number }
> = {
  gold: { color: '#f5bd5c', metalness: 1, roughness: 0.22, env: 1.6 },
  copper: { color: '#e08a5c', metalness: 1, roughness: 0.28, env: 1.4 },
  stainless: { color: '#c7ccd4', metalness: 1, roughness: 0.3, env: 1.2 },
  aluminum: { color: '#aeb4bd', metalness: 1, roughness: 0.42 },
  frame: { color: '#3a3f48', metalness: 0.7, roughness: 0.45 },
  rack: { color: '#171a21', metalness: 0.4, roughness: 0.55 },
  panel: { color: '#2b2f38', metalness: 0.5, roughness: 0.4 },
  plastic: { color: '#ffffff', metalness: 0, roughness: 0.45, env: 0.5 },
};

/** Cryostats, racks, cable trays, LEDs and instrument screens (see build.ts). */
function Equipment() {
  const dpr = useThree((s) => s.viewport.dpr);
  const gl = useThree((s) => s.gl);
  const tier = useTier();
  const detail = tier === 'low' ? 0.5 : 1;
  const env = useDisposable(() => bakeEnvironment(gl), [gl]);
  const room = useDisposable(() => {
    const built = buildLabRoom(detail);
    const leds = new BufferGeometry();
    leds.setAttribute('position', new BufferAttribute(built.leds.position, 3));
    leds.setAttribute('aColor', new BufferAttribute(built.leds.color, 3));
    leds.setAttribute('aPhase', new BufferAttribute(built.leds.phase, 1));
    const parts = MATERIALS.flatMap((m) => {
      const geometry = built.parts[m];
      return geometry ? [{ name: m, geometry }] : [];
    });
    return {
      parts,
      screens: built.screens,
      leds,
      chip: built.chip,
      dispose() {
        parts.forEach((p) => p.geometry.dispose());
        built.screens.dispose();
        leds.dispose();
      },
    };
  }, [detail]);
  const materials = useDisposable(() => {
    const list = Object.fromEntries(
      MATERIALS.map((m) => {
        const p = MATERIAL_PARAMS[m];
        return [
          m,
          new MeshStandardMaterial({
            color: p.color,
            metalness: p.metalness,
            roughness: p.roughness,
            vertexColors: true,
            envMap: env.texture,
            envMapIntensity: p.env ?? 1,
            side: DoubleSide,
          }),
        ];
      }),
    ) as Record<MaterialName, MeshStandardMaterial>;
    return { list, dispose: () => Object.values(list).forEach((m) => m.dispose()) };
  }, [env]);
  const screenMat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: screenVert,
        fragmentShader: screenFrag,
        uniforms: {
          uTime: { value: 0 },
          uCyan: { value: CYAN.clone() },
          uMagenta: { value: MAGENTA.clone() },
        },
      }),
    [],
  );
  const ledMat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: ledVert,
        fragmentShader: ledFrag,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  // The quantum chip on the underside of the package at the bottom of the open refrigerator.
  const chipGeo = useDisposable(
    () => new BoxGeometry(0.24, 0.012, 0.24).translate(room.chip.x, room.chip.y, room.chip.z),
    [room],
  );
  const chipMat = useDisposable(() => new MeshBasicMaterial({ color: CYAN.clone() }), []);

  useEffect(() => {
    ledMat.uniforms.uPixelRatio.value = dpr;
  }, [dpr, ledMat]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    screenMat.uniforms.uTime.value = t;
    ledMat.uniforms.uTime.value = t;
    chipMat.color.copy(CYAN).multiplyScalar(1.2 + 0.5 * Math.sin(t * 1.3));
  });

  return (
    <>
      {room.parts.map((p) => (
        <mesh key={p.name} geometry={p.geometry} material={materials.list[p.name]} />
      ))}
      <mesh geometry={room.screens} material={screenMat} />
      <mesh geometry={chipGeo} material={chipMat} />
      <points geometry={room.leds} material={ledMat} frustumCulled={false} />
    </>
  );
}

/**
 * The room around the experiment tables, modelled on a superconducting quantum-computing lab:
 * tiled floor, panelled walls, dilution refrigerators and racks of control electronics.
 */
/**
 * Clicking the open refrigerator explains what it is: an invisible volume around it catches
 * the pointer, and a label names it in the lab overview.
 */
function ComputerHotspot() {
  const t = useUi();
  const inLab = useLab((s) => s.current === null && !s.computer);
  const narrow = useThree((s) => s.size.width < 700);
  const geo = useDisposable(() => new CylinderGeometry(2, 2, 7.6, 16), []);
  const mat = useDisposable(() => new MeshBasicMaterial({ colorWrite: false, depthWrite: false }), []);
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (!useLab.getState().current) {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    }
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (useLab.getState().current) return;
    e.stopPropagation();
    document.body.style.cursor = '';
    useLab.getState().showComputer();
  };
  return (
    <group position={[-ROOM.fridgeX, 0, ROOM.fridgeZ]}>
      <mesh
        geometry={geo}
        material={mat}
        position={[0, 4.1, 0]}
        onPointerOver={onOver}
        onPointerOut={() => (document.body.style.cursor = '')}
        onClick={onClick}
      />
      {inLab && !narrow && (
        <Html position={[0, 0.2, 0]} center zIndexRange={[5, 0]}>
          <div
            aria-hidden="true"
            onClick={() => useLab.getState().showComputer()}
            className="cursor-pointer rounded-full border border-amber-300/40 bg-void/70 px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-amber-200 backdrop-blur-sm select-none hover:bg-amber-300/15"
          >
            {t.computerLabel}
          </div>
        </Html>
      )}
    </group>
  );
}

export function LabRoom() {
  return (
    <>
      <Walls />
      <Floor />
      <Equipment />
      <ComputerHotspot />
    </>
  );
}
