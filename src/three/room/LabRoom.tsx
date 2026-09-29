import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BoxGeometry,
  BufferGeometry,
  Color,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useDisposable } from '../../hooks/useDisposable';
import floorVert from '../shaders/lab/floor.vert.glsl?raw';
import floorFrag from '../shaders/lab/floor.frag.glsl?raw';
import wallVert from '../shaders/lab/wall.vert.glsl?raw';
import wallFrag from '../shaders/lab/wall.frag.glsl?raw';
import hardwareVert from '../shaders/lab/hardware.vert.glsl?raw';
import hardwareFrag from '../shaders/lab/hardware.frag.glsl?raw';
import screenVert from '../shaders/lab/screen.vert.glsl?raw';
import screenFrag from '../shaders/lab/screen.frag.glsl?raw';
import ledVert from '../shaders/lab/led.vert.glsl?raw';
import ledFrag from '../shaders/lab/led.frag.glsl?raw';
import { buildLabRoom, ROOM } from './build';

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

/** Cryostats, racks, cable trays, LEDs and instrument screens (see build.ts). */
function Equipment() {
  const dpr = useThree((s) => s.viewport.dpr);
  const room = useDisposable(() => {
    const built = buildLabRoom();
    const leds = new BufferGeometry();
    leds.setAttribute('position', new BufferAttribute(built.leds.position, 3));
    leds.setAttribute('aColor', new BufferAttribute(built.leds.color, 3));
    leds.setAttribute('aPhase', new BufferAttribute(built.leds.phase, 1));
    return {
      hardware: built.hardware,
      screens: built.screens,
      leds,
      dispose() {
        built.hardware.dispose();
        built.screens.dispose();
        leds.dispose();
      },
    };
  }, []);
  const hardwareMat = useDisposable(
    () => new ShaderMaterial({ vertexShader: hardwareVert, fragmentShader: hardwareFrag }),
    [],
  );
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
  // The quantum chip at the bottom of the open refrigerator: a small glowing tile.
  const chipGeo = useDisposable(
    () => new BoxGeometry(0.26, 0.05, 0.26).translate(-ROOM.fridgeX, 1.83 + ROOM.fridgeDrop, ROOM.fridgeZ),
    [],
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
      <mesh geometry={room.hardware} material={hardwareMat} />
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
export function LabRoom() {
  return (
    <>
      <Walls />
      <Floor />
      <Equipment />
    </>
  );
}
