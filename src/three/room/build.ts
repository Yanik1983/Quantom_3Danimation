import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../../physics/rng';

/**
 * Procedural geometry for the quantum-computing lab around the experiment tables. Everything
 * is baked into world space and merged, so the whole room costs a handful of draw calls:
 * one for all hardware (shaded by `hardware.frag.glsl` from a per-vertex tint and shine),
 * one for the status LEDs and one for the instrument screens.
 *
 * Layout (world units, floor at y = −1): back wall at z = −15.6; racks of control electronics
 * in the middle of it; an open dilution refrigerator (the gold "chandelier" of a
 * superconducting quantum computer) on the left, a closed cryostat on the right.
 */

export const ROOM = {
  floorY: -1,
  backZ: -15.6,
  sideX: 22,
  wallTop: 16,
  fridgeX: 12,
  fridgeZ: -12.5,
  fridgeDrop: -1,
  trayY: 8.4,
} as const;

type Rgb = readonly [number, number, number];
/** Tints (linear RGB) and shine (0 = painted steel, 1 = polished metal). */
const GOLD: Rgb = [0.95, 0.6, 0.2];
const COPPER: Rgb = [0.85, 0.42, 0.24];
const SILVER: Rgb = [0.62, 0.66, 0.74];
const STEEL: Rgb = [0.13, 0.15, 0.19];
const CAN: Rgb = [0.3, 0.32, 0.37];
const RACK: Rgb = [0.055, 0.065, 0.09];

function paint(g: BufferGeometry, tint: Rgb, shine: number): BufferGeometry {
  const n = g.getAttribute('position').count;
  const t = new Float32Array(n * 3);
  const s = new Float32Array(n).fill(shine);
  for (let i = 0; i < n; i++) t.set(tint, i * 3);
  g.setAttribute('aTint', new BufferAttribute(t, 3));
  g.setAttribute('aShine', new BufferAttribute(s, 1));
  g.deleteAttribute('uv');
  return g;
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number, tint: Rgb, shine: number) =>
  paint(new BoxGeometry(w, h, d).translate(x, y, z), tint, shine);

const cyl = (r: number, h: number, x: number, y: number, z: number, tint: Rgb, shine: number, seg = 48) =>
  paint(new CylinderGeometry(r, r, h, seg).translate(x, y, z), tint, shine);

function tube(points: Vector3[], radius: number, tint: Rgb, shine: number): BufferGeometry {
  const curve = new CatmullRomCurve3(points);
  return paint(new TubeGeometry(curve, points.length * 10, radius, 5, false), tint, shine);
}

/** A steel gantry (two legs and a beam) the cryostats hang from. */
function gantry(cx: number, cz: number, out: BufferGeometry[]) {
  const h = 10.4;
  for (const dx of [-2.3, 2.3]) out.push(box(0.2, h, 0.2, cx + dx, ROOM.floorY + h / 2, cz, STEEL, 0.25));
  out.push(box(4.8, 0.26, 0.3, cx, ROOM.floorY + h, cz, STEEL, 0.25));
}

/**
 * The open dilution refrigerator: stacked gold plates (each colder than the one above,
 * from 50 K at the top to ~10 mK at the bottom), thin support rods, coaxial lines that wind
 * down to the quantum chip, and a small heat-exchanger coil.
 */
function chandelier(cx: number, cz: number, out: BufferGeometry[]) {
  const ys = [8.0, 6.75, 5.6, 4.55, 3.6, 2.75];
  const rs = [1.6, 1.42, 1.22, 1.02, 0.86, 0.7];
  gantry(cx, cz, out);
  // Hangers from the beam to the top plate.
  for (const dx of [-0.9, 0.9]) out.push(cyl(0.05, 1.3, cx + dx, 8.75, cz, SILVER, 0.8, 8));

  ys.forEach((y, i) => {
    out.push(cyl(rs[i], 0.1, cx, y, cz, GOLD, 1, 64));
    out.push(paint(new TorusGeometry(rs[i], 0.03, 6, 64).rotateX(Math.PI / 2).translate(cx, y, cz), GOLD, 1));
    if (i === ys.length - 1) return;
    const rod = rs[i + 1] * 0.82;
    const len = y - ys[i + 1];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + i * 0.26;
      out.push(cyl(0.035, len, cx + Math.cos(a) * rod, y - len / 2, cz + Math.sin(a) * rod, SILVER, 0.8, 8));
    }
  });
  // Stage cans: still chamber and cold plate shields.
  out.push(cyl(0.42, 0.62, cx, (ys[2] + ys[3]) / 2, cz, COPPER, 0.9));
  out.push(cyl(0.3, 0.5, cx, (ys[4] + ys[5]) / 2, cz, GOLD, 1));
  // Mixing-chamber sample mount under the last plate (the chip sits at its tip).
  out.push(cyl(0.34, 0.55, cx, ys[5] - 0.33, cz, GOLD, 1));
  out.push(cyl(0.2, 0.3, cx, ys[5] - 0.75, cz, COPPER, 0.9));

  // Coaxial lines: pass through each plate at a slowly rotating angle, bowing outwards between plates.
  for (let k = 0; k < 10; k++) {
    const a0 = (k / 10) * Math.PI * 2;
    const pts: Vector3[] = [new Vector3(cx + Math.cos(a0) * 0.4, 9.2, cz + Math.sin(a0) * 0.4)];
    ys.forEach((y, i) => {
      const a = a0 + i * 0.22;
      const r = rs[i] * 0.58;
      pts.push(new Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r));
      if (i < ys.length - 1) {
        const am = a + 0.11;
        const rm = r + 0.2 + 0.08 * Math.sin(k * 1.7 + i);
        pts.push(new Vector3(cx + Math.cos(am) * rm, (y + ys[i + 1]) / 2, cz + Math.sin(am) * rm));
      }
    });
    pts.push(new Vector3(cx + Math.cos(a0 + 1.2) * 0.22, ys[5] - 0.2, cz + Math.sin(a0 + 1.2) * 0.22));
    out.push(tube(pts, 0.022, k % 3 === 0 ? COPPER : SILVER, 0.85));
  }
  // Heat-exchanger coil between two stages.
  const coil: Vector3[] = [];
  for (let s = 0; s <= 80; s++) {
    const a = (s / 80) * Math.PI * 2 * 5;
    coil.push(new Vector3(cx + Math.cos(a) * 0.55, ys[3] - 0.12 - (s / 80) * 0.7, cz + Math.sin(a) * 0.55));
  }
  out.push(paint(new TubeGeometry(new CatmullRomCurve3(coil), 240, 0.025, 5, false), COPPER, 0.9));
}

/** A closed cryostat: the outer vacuum can hides the plates, the gold top plate and wiring stay visible. */
function cryostat(cx: number, cz: number, out: BufferGeometry[]) {
  gantry(cx, cz, out);
  for (const dx of [-0.9, 0.9]) out.push(cyl(0.05, 1.3, cx + dx, 8.75, cz, SILVER, 0.8, 8));
  out.push(cyl(1.75, 0.16, cx, 8.0, cz, GOLD, 1, 64));
  const bottom = 2.2;
  const top = 7.9;
  out.push(cyl(1.38, top - bottom, cx, (top + bottom) / 2, cz, CAN, 0.55, 64));
  out.push(
    paint(
      new SphereGeometry(1.38, 48, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(cx, bottom, cz),
      CAN,
      0.55,
    ),
  );
  for (const y of [7.55, 5.9, 4.1]) {
    out.push(
      paint(new TorusGeometry(1.4, 0.06, 6, 64).rotateX(Math.PI / 2).translate(cx, y, cz), STEEL, 0.6),
    );
  }
  // Wiring bundle from the top plate up into the ceiling tray.
  for (let k = 0; k < 7; k++) {
    const x = cx - 0.9 + k * 0.3;
    out.push(
      tube(
        [
          new Vector3(x, 8.05, cz),
          new Vector3(x, 8.6, cz + 0.05 * k),
          new Vector3(x * 0.98, 9.25, cz - 0.4),
          new Vector3(x * 0.97, ROOM.trayY - ROOM.fridgeDrop, ROOM.backZ + 0.5),
        ],
        0.03,
        k % 2 ? SILVER : COPPER,
        0.8,
      ),
    );
  }
}

export interface RackLeds {
  position: Float32Array;
  color: Float32Array;
  phase: Float32Array;
}

const LED_COLORS: Rgb[] = [
  [0.1, 1.0, 0.45],
  [0.13, 0.89, 1.0],
  [1.0, 0.62, 0.1],
  [1.0, 0.24, 0.73],
];

/** Racks of control electronics (signal generators, amplifiers, readout) along the back wall. */
function racks(out: BufferGeometry[], screens: BufferGeometry[], leds: number[][]) {
  const rng = mulberry32(7331);
  const count = 6;
  const width = 1.7;
  const gap = 0.14;
  const depth = 1.0;
  const height = 3.7;
  const z = ROOM.backZ + 0.9 + depth / 2;
  const front = z + depth / 2;
  const x0 = -((count - 1) * (width + gap)) / 2;
  let screenId = 0;
  for (let r = 0; r < count; r++) {
    const x = x0 + r * (width + gap);
    out.push(box(width, height, depth, x, ROOM.floorY + height / 2, z, RACK, 0.15));
    // Instrument units stacked from the top down.
    let y = ROOM.floorY + height - 0.14;
    while (y > ROOM.floorY + 0.5) {
      const h = 0.2 + Math.floor(rng() * 4) * 0.12;
      if (y - h < ROOM.floorY + 0.35) break;
      const shade = 0.05 + rng() * 0.04;
      out.push(
        box(
          width - 0.14,
          h - 0.03,
          0.04,
          x,
          y - h / 2,
          front + 0.02,
          [shade, shade * 1.06, shade * 1.25],
          0.3,
        ),
      );
      if (h >= 0.44 && rng() < 0.55) {
        const sw = width * 0.52;
        const sh = h - 0.12;
        const g = new PlaneGeometry(sw, sh).translate(x + width * 0.14, y - h / 2, front + 0.045);
        const id = new Float32Array(g.getAttribute('position').count).fill(screenId++);
        g.setAttribute('aId', new BufferAttribute(id, 1));
        screens.push(g);
      }
      const n = 2 + Math.floor(rng() * 5);
      for (let k = 0; k < n; k++) {
        const c = LED_COLORS[Math.floor(rng() * LED_COLORS.length)];
        leds.push([x - width / 2 + 0.16 + k * 0.1, y - h / 2, front + 0.05, ...c, rng()]);
      }
      y -= h;
    }
  }
  // Cable trays: up from the racks and along the wall to both cryostats.
  for (const sx of [-1, 1]) {
    out.push(
      box(
        0.36,
        ROOM.trayY - (ROOM.floorY + height),
        0.18,
        sx * (-x0 + width / 2 + 0.3),
        (ROOM.trayY + ROOM.floorY + height) / 2,
        ROOM.backZ + 0.4,
        STEEL,
        0.3,
      ),
    );
  }
  out.push(box(2 * ROOM.fridgeX, 0.14, 0.7, 0, ROOM.trayY, ROOM.backZ + 0.5, STEEL, 0.3));
}

export interface LabRoomGeometry {
  hardware: BufferGeometry;
  screens: BufferGeometry;
  leds: RackLeds;
}

export function buildLabRoom(): LabRoomGeometry {
  const parts: BufferGeometry[] = [];
  const screenParts: BufferGeometry[] = [];
  const ledRows: number[][] = [];
  const fridges: BufferGeometry[] = [];
  chandelier(-ROOM.fridgeX, ROOM.fridgeZ, fridges);
  cryostat(ROOM.fridgeX, ROOM.fridgeZ, fridges);
  // Modelled with the beam at y = 9.4; lowered so the top plates stay in the overview frame
  // (the gantry legs end below the floor).
  fridges.forEach((g) => parts.push(g.translate(0, ROOM.fridgeDrop, 0)));
  racks(parts, screenParts, ledRows);

  const hardware = mergeGeometries(parts);
  const screens = mergeGeometries(screenParts);
  parts.forEach((g) => g.dispose());
  screenParts.forEach((g) => g.dispose());
  if (!hardware || !screens) throw new Error('Lab room geometry failed to merge');

  const n = ledRows.length;
  const leds: RackLeds = {
    position: new Float32Array(n * 3),
    color: new Float32Array(n * 3),
    phase: new Float32Array(n),
  };
  ledRows.forEach((row, i) => {
    leds.position.set(row.slice(0, 3), i * 3);
    leds.color.set(row.slice(3, 6), i * 3);
    leds.phase[i] = row[6];
  });
  return { hardware, screens, leds };
}
