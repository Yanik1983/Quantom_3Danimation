import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  PlaneGeometry,
  Shape,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Curve,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../../physics/rng';

/**
 * Procedural models for the quantum-computing lab around the experiment tables. Parts are
 * baked into world space and merged per material (gold, copper, stainless, aluminium, …), so
 * the whole room costs one draw call per material plus the LEDs and the instrument screens.
 * Materials are physically based and reflect a baked lab environment (see LabRoom.tsx).
 *
 * Layout (world units, floor at y = −1): back wall at z = −15.6; racks of control electronics
 * in the middle of it; an open dilution refrigerator (the gold "chandelier" of a
 * superconducting quantum computer) on the left, a closed cryostat on the right, each hanging
 * from an aluminium frame.
 */

export const ROOM = {
  floorY: -1,
  backZ: -15.6,
  sideX: 22,
  wallTop: 16,
  fridgeX: 12,
  fridgeZ: -12.5,
  /** Top of the frames the refrigerators hang from. */
  beamY: 8.4,
  trayY: 8.4,
} as const;

export const MATERIALS = [
  'gold',
  'copper',
  'stainless',
  'aluminum',
  'frame',
  'rack',
  'panel',
  'plastic',
] as const;
export type MaterialName = (typeof MATERIALS)[number];

/** Level of detail: segment counts scale with it (the low quality tier halves them). */
export type Detail = 1 | 0.5;

type Rgb = readonly [number, number, number];
const WHITE: Rgb = [1, 1, 1];

/** Collects parts per material; every part carries a vertex colour that tints its material. */
class Kit {
  readonly parts = Object.fromEntries(MATERIALS.map((m) => [m, [] as BufferGeometry[]])) as Record<
    MaterialName,
    BufferGeometry[]
  >;
  constructor(readonly detail: Detail) {}

  /** Segment count scaled by the level of detail. */
  seg(n: number): number {
    return Math.max(6, Math.round(n * this.detail));
  }

  add(mat: MaterialName, g: BufferGeometry, tint: Rgb = WHITE): void {
    g.deleteAttribute('uv');
    if (!g.index) g = mergeVertices(g, 1e-5);
    const n = g.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set(tint, i * 3);
    g.setAttribute('color', new BufferAttribute(c, 3));
    this.parts[mat].push(g);
  }

  box(mat: MaterialName, w: number, h: number, d: number, x: number, y: number, z: number, tint?: Rgb) {
    this.add(mat, new BoxGeometry(w, h, d).translate(x, y, z), tint);
  }

  cyl(mat: MaterialName, r: number, h: number, x: number, y: number, z: number, seg = 32, tint?: Rgb) {
    this.add(mat, new CylinderGeometry(r, r, h, this.seg(seg)).translate(x, y, z), tint);
  }

  /** Surface of revolution about the vertical axis through (x, z); profile points are (radius, height). */
  lathe(
    mat: MaterialName,
    profile: [number, number][],
    x: number,
    y: number,
    z: number,
    seg = 64,
    tint?: Rgb,
  ) {
    const pts = profile.map(([r, h]) => new Vector2(r, h));
    this.add(mat, new LatheGeometry(pts, this.seg(seg)).translate(x, y, z), tint);
  }

  tube(mat: MaterialName, curve: Curve<Vector3>, segments: number, r: number, radial = 8, tint?: Rgb) {
    this.add(mat, new TubeGeometry(curve, this.seg(segments), r, Math.max(5, radial), false), tint);
  }

  ring(mat: MaterialName, R: number, r: number, x: number, y: number, z: number, tint?: Rgb) {
    this.add(mat, new TorusGeometry(R, r, 8, this.seg(96)).rotateX(Math.PI / 2).translate(x, y, z), tint);
  }

  /** Hex bolt heads on a circle (top side of a flange at height y). */
  bolts(mat: MaterialName, R: number, count: number, x: number, y: number, z: number, size = 0.028) {
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2;
      this.add(
        mat,
        new CylinderGeometry(size, size, size * 0.8, 6)
          .rotateY(a)
          .translate(x + Math.cos(a) * R, y + size * 0.4, z + Math.sin(a) * R),
      );
    }
  }

  merged(): Record<MaterialName, BufferGeometry | null> {
    const out = {} as Record<MaterialName, BufferGeometry | null>;
    for (const m of MATERIALS) {
      const list = this.parts[m];
      out[m] = list.length ? mergeGeometries(list) : null;
      list.forEach((g) => g.dispose());
    }
    return out;
  }
}

/** A flat plate with rounded edges (profile for the lathe), top at y = 0. */
function plateProfile(R: number, t: number, bevel = 0.018): [number, number][] {
  return [
    [0, 0],
    [R - bevel, 0],
    [R - bevel * 0.3, -bevel * 0.3],
    [R, -bevel],
    [R, -t + bevel],
    [R - bevel * 0.3, -t + bevel * 0.3],
    [R - bevel, -t],
    [0, -t],
  ];
}

/** Aluminium T-slot extrusion profile (square with a slot on each face). */
function tSlotShape(s: number): Shape {
  const h = s / 2;
  const slot = s * 0.26;
  const depth = s * 0.2;
  const shape = new Shape();
  const pts: [number, number][] = [];
  // Walk the square anticlockwise, cutting a notch in the middle of each side.
  const corners: [number, number][] = [
    [-h, -h],
    [h, -h],
    [h, h],
    [-h, h],
  ];
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = corners[i];
    const [bx, by] = corners[(i + 1) % 4];
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = Math.sign(bx - ax);
    const dy = Math.sign(by - ay);
    // Inward normal of this side.
    const nx = -dy;
    const ny = dx;
    pts.push([ax, ay]);
    pts.push([mx - (dx * slot) / 2, my - (dy * slot) / 2]);
    pts.push([mx - (dx * slot) / 2 + nx * depth, my - (dy * slot) / 2 + ny * depth]);
    pts.push([mx + (dx * slot) / 2 + nx * depth, my + (dy * slot) / 2 + ny * depth]);
    pts.push([mx + (dx * slot) / 2, my + (dy * slot) / 2]);
  }
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  return shape;
}

/** A length of T-slot extrusion from a to b. */
function extrusion(kit: Kit, a: Vector3, b: Vector3, s = 0.2) {
  const len = a.distanceTo(b);
  const g = new ExtrudeGeometry(tSlotShape(s), { depth: len, bevelEnabled: false, steps: 1 });
  // Extruded along +z from the origin: orient it from a to b.
  const dir = new Vector3().subVectors(b, a).normalize();
  const up = Math.abs(dir.y) > 0.99 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const basisZ = dir;
  const basisX = new Vector3().crossVectors(up, basisZ).normalize();
  const basisY = new Vector3().crossVectors(basisZ, basisX);
  const pos = g.getAttribute('position');
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    const w = new Vector3()
      .addScaledVector(basisX, v.x)
      .addScaledVector(basisY, v.y)
      .addScaledVector(basisZ, v.z)
      .add(a);
    pos.setXYZ(i, w.x, w.y, w.z);
  }
  g.computeVertexNormals();
  kit.add('aluminum', g);
}

/**
 * A frame of aluminium extrusion: four legs, a rectangle at the top and a mounting plate the
 * refrigerator hangs from, plus feet and diagonal braces.
 */
function frame(kit: Kit, cx: number, cz: number) {
  const hw = 2.3;
  const hd = 1.6;
  const top = ROOM.beamY;
  const floor = ROOM.floorY;
  const legs: [number, number][] = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];
  for (const [dx, dz] of legs) {
    extrusion(kit, new Vector3(cx + dx, floor + 0.05, cz + dz), new Vector3(cx + dx, top, cz + dz));
    kit.box('frame', 0.36, 0.05, 0.36, cx + dx, floor + 0.025, cz + dz);
    kit.cyl('frame', 0.09, 0.08, cx + dx, floor + 0.09, cz + dz, 16);
  }
  for (let i = 0; i < 4; i++) {
    const [ax, az] = legs[i];
    const [bx, bz] = legs[(i + 1) % 4];
    const inset = 0.1;
    const sx = Math.sign(bx - ax) * inset;
    const sz = Math.sign(bz - az) * inset;
    extrusion(
      kit,
      new Vector3(cx + ax + sx, top, cz + az + sz),
      new Vector3(cx + bx - sx, top, cz + bz - sz),
    );
    // Mid-height rail on the sides.
    if (i % 2 === 1) {
      extrusion(
        kit,
        new Vector3(cx + ax + sx, 2.2, cz + az + sz),
        new Vector3(cx + bx - sx, 2.2, cz + bz - sz),
        0.16,
      );
    }
  }
  // Cross beams under the mounting plate.
  for (const dz of [-0.9, 0.9]) {
    extrusion(
      kit,
      new Vector3(cx - hw + 0.1, top - 0.02, cz + dz),
      new Vector3(cx + hw - 0.1, top - 0.02, cz + dz),
    );
  }
  kit.box('frame', 3.4, 0.08, 2.2, cx, top - 0.16, cz);
}

/** Semi-rigid coax: straight through each plate, then a smooth S-bend to the next plate. */
function coaxPath(
  cx: number,
  cz: number,
  ys: readonly number[],
  radii: readonly number[],
  a0: number,
  wobble: number,
): Vector3[] {
  const pts: Vector3[] = [];
  const at = (r: number, a: number, y: number) => new Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
  pts.push(at(radii[0], a0, ys[0] + 0.9));
  pts.push(at(radii[0], a0, ys[0] + 0.3));
  for (let i = 0; i < ys.length - 1; i++) {
    const a = a0 + i * 0.12;
    const an = a0 + (i + 1) * 0.12;
    const gap = ys[i] - ys[i + 1];
    pts.push(at(radii[i], a, ys[i] - 0.12));
    pts.push(at(radii[i] + 0.12 + wobble, (a + an) / 2, ys[i] - gap * 0.5));
    pts.push(at(radii[i + 1], an, ys[i + 1] + 0.14));
  }
  const last = ys.length - 1;
  pts.push(at(radii[last], a0 + last * 0.12, ys[last] - 0.1));
  return pts;
}

/**
 * The open dilution refrigerator (the "chandelier"): gold-plated copper stages, each colder
 * than the one above (≈ 50 K, 4 K, 0.8 K still, 100 mK, and ≈ 10 mK at the mixing chamber),
 * stainless support rods, semi-rigid coaxial lines with attenuators at every stage, a HEMT
 * amplifier, circulators, the still with its heat exchangers, and the chip package at the bottom.
 * Returns the position of the chip.
 */
function chandelier(kit: Kit, cx: number, cz: number): Vector3 {
  frame(kit, cx, cz);
  const ys = [7.0, 5.75, 4.6, 3.55, 2.6, 1.75] as const;
  const rs = [1.6, 1.44, 1.24, 1.04, 0.88, 0.72] as const;
  const plateT = [0.14, 0.11, 0.1, 0.09, 0.09, 0.1];

  // Stainless top flange (room temperature) hanging from the frame.
  const topY = 7.85;
  kit.lathe('stainless', plateProfile(1.72, 0.12, 0.02), cx, topY, cz, 96);
  kit.bolts('stainless', 1.6, 32, cx, topY, cz, 0.032);
  for (const [dx, dz] of [
    [-1.1, -0.7],
    [1.1, -0.7],
    [-1.1, 0.7],
    [1.1, 0.7],
  ]) {
    kit.cyl('stainless', 0.045, ROOM.beamY - 0.2 - topY, cx + dx, (ROOM.beamY - 0.2 + topY) / 2, cz + dz, 12);
  }
  // Vacuum feedthrough ports on the top flange, with KF clamps.
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3;
    const px = cx + Math.cos(a) * 1.05;
    const pz = cz + Math.sin(a) * 1.05;
    kit.lathe(
      'stainless',
      [
        [0, 0.28],
        [0.1, 0.28],
        [0.13, 0.25],
        [0.13, 0.2],
        [0.08, 0.18],
        [0.08, 0],
      ],
      px,
      topY,
      pz,
      32,
    );
    kit.ring('stainless', 0.135, 0.02, px, topY + 0.225, pz);
  }

  // Stages: rounded gold plates with bolt circles.
  ys.forEach((y, i) => {
    kit.lathe('gold', plateProfile(rs[i], plateT[i]), cx, y + plateT[i] / 2, cz, 96);
    kit.bolts('gold', rs[i] - 0.07, 24, cx, y + plateT[i] / 2, cz);
  });
  // Support rods between stages (thin-walled stainless with gold collars).
  const hangers = [topY - 0.12, ...ys];
  for (let i = 0; i < hangers.length - 1; i++) {
    const r = (i === 0 ? rs[0] : rs[i]) * 0.86;
    const rNext = rs[i] * 0.86;
    const y0 = hangers[i] - (i === 0 ? 0 : plateT[i - 1] / 2);
    const y1 = hangers[i + 1] + plateT[i] / 2;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + i * 0.3;
      const rr = Math.min(r, rNext) - 0.04;
      const x = cx + Math.cos(a) * rr;
      const z = cz + Math.sin(a) * rr;
      kit.cyl('stainless', 0.03, y0 - y1, x, (y0 + y1) / 2, z, 12);
      kit.cyl('gold', 0.045, 0.05, x, y0 - 0.025, z, 16);
      kit.cyl('gold', 0.045, 0.05, x, y1 + 0.025, z, 16);
    }
  }

  // Coaxial lines, with an attenuator (gold cylinder and SMA hex nuts) where each crosses a plate.
  const lines = 18;
  const rng = mulberry32(4242);
  for (let k = 0; k < lines; k++) {
    const a0 = (k / lines) * Math.PI * 2;
    const radii = rs.map((r, i) => r * (0.5 + 0.08 * Math.sin(k * 2.1 + i)));
    const pts = coaxPath(cx, cz, ys, radii, a0, 0.05 * rng());
    const mat: MaterialName = k % 3 === 0 ? 'copper' : 'stainless';
    kit.tube(mat, new CatmullRomCurve3(pts, false, 'catmullrom', 0.2), 220, 0.018, 8);
    for (let i = 1; i < ys.length; i++) {
      if ((k + i) % 2) continue;
      const a = a0 + i * 0.12;
      const x = cx + Math.cos(a) * radii[i];
      const z = cz + Math.sin(a) * radii[i];
      const y = ys[i] + plateT[i] / 2 + 0.09;
      kit.cyl('gold', 0.034, 0.14, x, y, z, 16);
      kit.cyl('stainless', 0.03, 0.03, x, y + 0.085, z, 6);
      kit.cyl('stainless', 0.03, 0.03, x, y - 0.085, z, 6);
    }
  }

  // HEMT amplifier on the 4 K stage (underside), with cooling fins.
  for (const s of [-1, 1]) {
    const x = cx + s * 0.55;
    const y = ys[1] - plateT[1] / 2 - 0.1;
    kit.box('gold', 0.34, 0.14, 0.2, x, y, cz + 0.2);
    for (let f = 0; f < 5; f++) kit.box('gold', 0.3, 0.012, 0.22, x, y - 0.09 - f * 0.025, cz + 0.2);
  }
  // Still: copper can with a silver heat-exchanger coil around it.
  const stillY = (ys[2] + ys[3]) / 2;
  kit.lathe(
    'copper',
    [
      [0, 0.3],
      [0.38, 0.3],
      [0.42, 0.26],
      [0.42, -0.26],
      [0.38, -0.3],
      [0, -0.3],
    ],
    cx,
    stillY,
    cz,
    64,
  );
  for (const dy of [-0.2, 0, 0.2]) kit.ring('gold', 0.43, 0.015, cx, stillY + dy, cz);
  const coil: Vector3[] = [];
  for (let s = 0; s <= 120; s++) {
    const a = (s / 120) * Math.PI * 2 * 6;
    coil.push(new Vector3(cx + Math.cos(a) * 0.52, ys[3] - 0.14 - (s / 120) * 0.62, cz + Math.sin(a) * 0.52));
  }
  kit.tube('stainless', new CatmullRomCurve3(coil), 480, 0.022, 8);
  // Sintered silver heat exchanger block on the cold plate.
  kit.box('stainless', 0.3, 0.16, 0.3, cx - 0.35, ys[4] + 0.15, cz - 0.3);

  // Circulators and isolators under the 100 mK plate: small boxes with SMA stubs.
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.6;
    const x = cx + Math.cos(a) * 0.5;
    const z = cz + Math.sin(a) * 0.5;
    const y = ys[4] - plateT[4] / 2 - 0.1;
    kit.box('stainless', 0.18, 0.12, 0.18, x, y, z, [0.8, 0.82, 0.86]);
    kit.cyl('gold', 0.05, 0.02, x, y - 0.07, z, 20);
    for (const d of [-1, 1])
      kit.add(
        'gold',
        new CylinderGeometry(0.018, 0.018, 0.08, 6).rotateZ(Math.PI / 2).translate(x + d * 0.12, y, z),
      );
  }

  // Mixing chamber: a finned copper can under the last stage, then the cold finger.
  const mcTop = ys[5] - plateT[5] / 2;
  const fins: [number, number][] = [[0, 0]];
  for (let f = 0; f <= 12; f++) {
    const y = -0.03 - f * 0.035;
    fins.push([f % 2 ? 0.3 : 0.34, y]);
  }
  fins.push([0.26, -0.5], [0, -0.52]);
  kit.lathe('copper', fins, cx, mcTop, cz, 64);
  kit.cyl('gold', 0.07, 0.4, cx, mcTop - 0.72, cz, 24);
  // Chip package: gold box with SMA connectors all round; the chip glows on its underside.
  const pkgY = mcTop - 0.98;
  kit.box('gold', 0.42, 0.1, 0.42, cx, pkgY, cz);
  kit.box('gold', 0.46, 0.02, 0.46, cx, pkgY + 0.06, cz);
  for (let k = 0; k < 8; k++) {
    const side = k % 4;
    const off = k < 4 ? -0.1 : 0.1;
    const nx = side === 0 ? 1 : side === 1 ? -1 : 0;
    const nz = side === 2 ? 1 : side === 3 ? -1 : 0;
    const x = cx + nx * 0.25 + (nz !== 0 ? off : 0);
    const z = cz + nz * 0.25 + (nx !== 0 ? off : 0);
    const g = new CylinderGeometry(0.022, 0.022, 0.09, 6);
    g.rotateZ(nx !== 0 ? Math.PI / 2 : 0).rotateX(nz !== 0 ? Math.PI / 2 : 0);
    kit.add('stainless', g.translate(x, pkgY, z));
  }
  // Wiring looms from the top flange up to the frame.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const x0 = cx + Math.cos(a) * 0.45;
    const z0 = cz + Math.sin(a) * 0.45;
    kit.tube(
      'plastic',
      new CatmullRomCurve3([
        new Vector3(x0, topY + 0.02, z0),
        new Vector3(x0 * 0.98 + cx * 0.02, topY + 0.3, z0),
        new Vector3(cx + (x0 - cx) * 1.6, ROOM.beamY - 0.3, cz - 0.9),
      ]),
      40,
      0.025,
      8,
      k % 2 ? [0.12, 0.3, 0.7] : [0.5, 0.52, 0.56],
    );
  }
  return new Vector3(cx, pkgY - 0.055, cz);
}

/** A corrugated (bellows) hose along a curve, as used for vacuum pumping lines. */
function bellows(kit: Kit, curve: Curve<Vector3>, r: number, ribs: number) {
  const segs = kit.seg(ribs * 6);
  const g = new TubeGeometry(curve, segs, r, kit.seg(20), false);
  const pos = g.getAttribute('position');
  const radial = kit.seg(20) + 1;
  const p = new Vector3();
  const c = new Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, c);
    const k = 1 + 0.16 * Math.cos(t * ribs * Math.PI * 2);
    for (let j = 0; j < radial; j++) {
      const idx = i * radial + j;
      p.set(pos.getX(idx), pos.getY(idx), pos.getZ(idx)).sub(c).multiplyScalar(k).add(c);
      pos.setXYZ(idx, p.x, p.y, p.z);
    }
  }
  g.computeVertexNormals();
  kit.add('stainless', g);
}

/**
 * A closed cryostat: the brushed-aluminium outer vacuum can in bolted sections, a rounded
 * bottom, the stainless top flange with feedthroughs, and a corrugated pumping line.
 */
function cryostat(kit: Kit, cx: number, cz: number) {
  frame(kit, cx, cz);
  const topY = 7.0;
  const bottom = 1.25;
  const R = 1.38;
  kit.lathe('stainless', plateProfile(1.78, 0.16, 0.025), cx, topY + 0.16, cz, 96);
  kit.bolts('stainless', 1.66, 36, cx, topY + 0.16, cz, 0.034);
  for (const [dx, dz] of [
    [-1.1, -0.7],
    [1.1, -0.7],
    [-1.1, 0.7],
    [1.1, 0.7],
  ]) {
    kit.cyl('stainless', 0.045, ROOM.beamY - 0.2 - topY, cx + dx, (ROOM.beamY - 0.2 + topY) / 2, cz + dz, 12);
  }
  // Outer vacuum can: sections joined by bolted flanges, with a dished bottom.
  const flanges = [topY - 0.02, 5.1, 3.2];
  const profile: [number, number][] = [[R, topY - bottom]];
  profile.push([R, 0]);
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * (Math.PI / 2);
    profile.push([R * Math.cos(a), -Math.sin(a) * R * 0.55]);
  }
  profile.reverse();
  kit.lathe('aluminum', profile, cx, bottom, cz, 96);
  for (const y of flanges) {
    kit.lathe(
      'aluminum',
      [
        [R, 0.05],
        [R + 0.1, 0.05],
        [R + 0.12, 0.03],
        [R + 0.12, -0.03],
        [R + 0.1, -0.05],
        [R, -0.05],
      ],
      cx,
      y,
      cz,
      96,
    );
    kit.bolts('stainless', R + 0.07, 32, cx, y + 0.05, cz, 0.022);
  }
  // Feedthroughs and connectors on the top flange.
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.2;
    const px = cx + Math.cos(a) * 1.15;
    const pz = cz + Math.sin(a) * 1.15;
    kit.cyl('stainless', 0.1, 0.22, px, topY + 0.27, pz, 24);
    kit.cyl('plastic', 0.07, 0.12, px, topY + 0.44, pz, 16, [0.08, 0.08, 0.09]);
    kit.tube(
      'plastic',
      new CatmullRomCurve3([
        new Vector3(px, topY + 0.5, pz),
        new Vector3(px, topY + 0.8, pz),
        new Vector3(cx + (px - cx) * 1.3, ROOM.beamY - 0.3, cz - 0.9),
      ]),
      40,
      0.03,
      8,
      k % 3 === 0 ? [0.12, 0.3, 0.7] : [0.45, 0.47, 0.5],
    );
  }
  // Pumping port and a corrugated line running up to the wall.
  kit.cyl('stainless', 0.2, 0.3, cx - 0.3, topY + 0.31, cz + 0.25, 32);
  kit.ring('stainless', 0.21, 0.03, cx - 0.3, topY + 0.46, cz + 0.25);
  bellows(
    kit,
    new CatmullRomCurve3([
      new Vector3(cx - 0.3, topY + 0.46, cz + 0.25),
      new Vector3(cx - 0.3, topY + 1.1, cz + 0.25),
      new Vector3(cx - 0.1, ROOM.beamY - 0.35, cz - 0.6),
      new Vector3(cx + 0.3, ROOM.beamY - 0.35, ROOM.backZ + 0.8),
    ]),
    0.13,
    46,
  );
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
const CABLE_COLORS: Rgb[] = [
  [0.12, 0.3, 0.75],
  [0.6, 0.62, 0.66],
  [0.75, 0.15, 0.12],
  [0.85, 0.65, 0.15],
];

/**
 * Racks of control electronics (signal generators, amplifiers, readout) along the back wall:
 * steel frames with side panels, instruments with handles, knobs, connectors and screens, and
 * short patch cables between them.
 */
function racks(kit: Kit, screens: BufferGeometry[], leds: number[][]) {
  const rng = mulberry32(7331);
  const count = 6;
  const width = 1.7;
  const gap = 0.14;
  const depth = 1.0;
  const height = 3.7;
  const z = ROOM.backZ + 0.9 + depth / 2;
  const front = z + depth / 2;
  const x0 = -((count - 1) * (width + gap)) / 2;
  const floor = ROOM.floorY;
  let screenId = 0;
  for (let r = 0; r < count; r++) {
    const x = x0 + r * (width + gap);
    // Cabinet: side panels, top, plinth and the four front posts.
    for (const s of [-1, 1])
      kit.box('rack', 0.04, height, depth, x + s * (width / 2 - 0.02), floor + height / 2, z);
    kit.box('rack', width, 0.06, depth, x, floor + height - 0.03, z);
    kit.box('rack', width, 0.12, depth, x, floor + 0.06, z, [0.6, 0.6, 0.6]);
    kit.box('rack', width - 0.08, height, 0.02, x, floor + height / 2, z - depth / 2 + 0.01, [0.5, 0.5, 0.5]);
    for (const s of [-1, 1])
      kit.box(
        'frame',
        0.05,
        height - 0.1,
        0.05,
        x + s * (width / 2 - 0.08),
        floor + height / 2,
        front - 0.03,
      );
    // Top vent grille.
    for (let v = 0; v < 8; v++)
      kit.box('frame', width - 0.3, 0.012, 0.03, x, floor + height + 0.006, z - 0.3 + v * 0.08);

    // Instruments stacked from the top down.
    let y = floor + height - 0.1;
    while (y > floor + 0.45) {
      const h = 0.2 + Math.floor(rng() * 4) * 0.12;
      if (y - h < floor + 0.3) break;
      const cy = y - h / 2;
      const shade = 0.75 + rng() * 0.5;
      const w = width - 0.2;
      kit.box('panel', w, h - 0.025, 0.035, x, cy, front + 0.0175, [shade, shade * 1.02, shade * 1.1]);
      // Rack ears with carry handles.
      for (const s of [-1, 1]) {
        const hx = x + s * (w / 2 - 0.05);
        kit.add(
          'stainless',
          new TorusGeometry(Math.min(0.08, h * 0.3), 0.012, 6, kit.seg(16), Math.PI)
            .rotateZ((-Math.PI / 2) * s)
            .rotateY(Math.PI / 2)
            .scale(1, 1, 1)
            .translate(hx, cy, front + 0.04),
        );
      }
      const hasScreen = h >= 0.44 && rng() < 0.6;
      if (hasScreen) {
        const sw = 0.62;
        const sh = h - 0.12;
        const sx = x + 0.02;
        // Bezel, recessed screen.
        kit.box('plastic', sw + 0.05, sh + 0.05, 0.02, sx, cy, front + 0.04, [0.05, 0.05, 0.06]);
        const g = new PlaneGeometry(sw, sh).translate(sx, cy, front + 0.062);
        const id = new Float32Array(g.getAttribute('position').count).fill(screenId++);
        g.setAttribute('aId', new BufferAttribute(id, 1));
        screens.push(g);
      }
      // Knobs and BNC connectors on the right-hand part of the panel.
      const knobs = hasScreen ? 1 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 3);
      for (let k = 0; k < knobs; k++) {
        const kx = x + w / 2 - 0.16 - k * 0.14;
        kit.add(
          'plastic',
          new CylinderGeometry(0.035, 0.04, 0.035, kit.seg(20))
            .rotateX(Math.PI / 2)
            .translate(kx, cy + h * 0.12, front + 0.052),
          [0.1, 0.1, 0.11],
        );
        kit.add(
          'stainless',
          new CylinderGeometry(0.018, 0.018, 0.05, 8)
            .rotateX(Math.PI / 2)
            .translate(kx, cy - h * 0.22, front + 0.06),
        );
      }
      const n = hasScreen ? 2 + Math.floor(rng() * 3) : 2 + Math.floor(rng() * 5);
      for (let k = 0; k < n; k++) {
        const c = LED_COLORS[Math.floor(rng() * LED_COLORS.length)];
        leds.push([x - w / 2 + 0.16 + k * 0.08, cy + h * 0.2, front + 0.05, ...c, rng()]);
      }
      // A patch cable dropping to the instrument below.
      if (rng() < 0.5 && y - h - 0.3 > floor + 0.5) {
        const px = x + w / 2 - 0.16;
        kit.tube(
          'plastic',
          new CatmullRomCurve3([
            new Vector3(px, cy - h * 0.22, front + 0.08),
            new Vector3(px + 0.05, cy - h * 0.5, front + 0.2),
            new Vector3(px - 0.05, y - h - 0.2, front + 0.08),
          ]),
          24,
          0.012,
          6,
          CABLE_COLORS[Math.floor(rng() * CABLE_COLORS.length)],
        );
      }
      y -= h;
    }
  }
  // Cable trays: up from the racks and along the wall to both cryostats (ladder trays).
  const trayTop = ROOM.trayY;
  for (const sx of [-1, 1]) {
    const tx = sx * (-x0 + width / 2 + 0.3);
    const h = trayTop - (floor + height);
    for (const s of [-1, 1])
      kit.box('frame', 0.03, h, 0.14, tx + s * 0.17, (trayTop + floor + height) / 2, ROOM.backZ + 0.4);
    for (let k = 0; k < h / 0.3; k++)
      kit.box('frame', 0.34, 0.02, 0.04, tx, floor + height + 0.15 + k * 0.3, ROOM.backZ + 0.36);
    // Cable bundle inside the tray.
    for (let c = 0; c < 4; c++) {
      kit.cyl(
        'plastic',
        0.025,
        h,
        tx - 0.09 + c * 0.06,
        (trayTop + floor + height) / 2,
        ROOM.backZ + 0.42,
        8,
        CABLE_COLORS[c],
      );
    }
  }
  const len = 2 * ROOM.fridgeX - 2.4;
  for (const s of [-1, 1]) kit.box('frame', len, 0.14, 0.03, 0, trayTop, ROOM.backZ + 0.5 + s * 0.34);
  for (let k = 0; k < len / 0.35; k++)
    kit.box('frame', 0.04, 0.02, 0.68, -len / 2 + k * 0.35, trayTop - 0.06, ROOM.backZ + 0.5);
}

export interface LabRoomGeometry {
  parts: Record<MaterialName, BufferGeometry | null>;
  screens: BufferGeometry;
  leds: RackLeds;
  chip: Vector3;
}

export function buildLabRoom(detail: Detail = 1): LabRoomGeometry {
  const kit = new Kit(detail);
  const screenParts: BufferGeometry[] = [];
  const ledRows: number[][] = [];
  const chip = chandelier(kit, -ROOM.fridgeX, ROOM.fridgeZ);
  cryostat(kit, ROOM.fridgeX, ROOM.fridgeZ);
  racks(kit, screenParts, ledRows);

  const parts = kit.merged();
  const screens = mergeGeometries(screenParts);
  screenParts.forEach((g) => g.dispose());
  if (!screens) throw new Error('Lab room geometry failed to merge');

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
  return { parts, screens, leds, chip };
}
