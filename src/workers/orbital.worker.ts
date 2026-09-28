/// <reference lib="webworker" />
/** Samples hydrogen orbitals and evaluates exact ψ on cross-section planes. */
import { psi, sampleOrbital } from '../physics/hydrogen';
import { mulberry32 } from '../physics/rng';
import { toHalf } from '../lib/half';
import type { OrbitalRequest, OrbitalResponse } from './orbitalProtocol';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (e: MessageEvent<OrbitalRequest>) => {
  const msg = e.data;
  if (msg.type === 'sample') {
    const s = sampleOrbital(msg.n, msg.l, msg.m, msg.count, mulberry32(msg.seed));
    const reply: OrbitalResponse = {
      type: 'sample',
      id: msg.id,
      positions: s.positions,
      signs: s.signs,
      r95: s.r95,
    };
    self.postMessage(reply, [s.positions.buffer, s.signs.buffer]);
    return;
  }
  const { res, extent, y0, n, l, m } = msg;
  const values = new Float64Array(res * res);
  let max = 0;
  for (let j = 0; j < res; j++) {
    const z = -extent + ((j + 0.5) / res) * 2 * extent;
    for (let i = 0; i < res; i++) {
      const x = -extent + ((i + 0.5) / res) * 2 * extent;
      const r = Math.hypot(x, y0, z);
      const theta = r > 0 ? Math.acos(z / r) : 0;
      const v = psi(n, l, m, r, theta, Math.atan2(y0, x));
      values[j * res + i] = v;
      max = Math.max(max, Math.abs(v));
    }
  }
  const data = new Uint16Array(res * res);
  for (let k = 0; k < data.length; k++) data[k] = toHalf(max > 0 ? values[k] / max : 0);
  const reply: OrbitalResponse = { type: 'slice', id: msg.id, data, res };
  self.postMessage(reply, [data.buffer]);
};
