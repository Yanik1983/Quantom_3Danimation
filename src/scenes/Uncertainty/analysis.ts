import { centeredGrid1D } from '../../physics/grid';
import {
  buildPacket1D,
  MomentumTransform,
  spread,
  type Packet1D,
  type Spread,
} from '../../physics/wavepacket1d';

/** 2048 points over 80 units: Δx = 0.039, Δp = 0.079 (ℏ = 1). */
export const GRID = centeredGrid1D(2048, 80);
export const XS = Float64Array.from({ length: GRID.n }, (_, i) => GRID.x0 + i * GRID.dx);

const transform = new MomentumTransform(GRID);
const psi = new Float64Array(2 * GRID.n);

export interface Analysis {
  psi: Float64Array;
  phi: Float64Array;
  p: Float64Array;
  x: Spread;
  k: Spread;
}

let lastKey = '';
let last: Analysis | null = null;

/** ψ(x), φ(p) and their spreads. Cached on the packet parameters (scene and controls share it). */
export function analyse(packet: Packet1D): Analysis {
  const key = JSON.stringify(packet);
  if (key === lastKey && last) return last;
  buildPacket1D(GRID, packet, psi);
  const phi = transform.transform(psi);
  last = { psi, phi, p: transform.p, x: spread(XS, psi), k: spread(transform.p, phi) };
  lastKey = key;
  return last;
}
