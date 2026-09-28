/// <reference lib="webworker" />
/** Live 1D wave-packet scattering off a rectangular barrier. */
import { centeredGrid1D } from '../physics/grid';
import { cap1D, rectBarrier } from '../physics/potentials';
import { probabilityIn, SplitStep1D } from '../physics/splitStep1d';
import { buildPacket1D } from '../physics/wavepacket1d';
import { DISPLAY_HALF, DISPLAY_SAMPLES, PACKET_SIGMA, PACKET_X0, SIM } from '../scenes/Tunneling/constants';
import type { TunnelConfig, TunnelRequest, TunnelTick } from './tunnelingProtocol';

declare const self: DedicatedWorkerGlobalScope;

const grid = centeredGrid1D(SIM.n, SIM.length);
const absorb = cap1D(grid, SIM.capWidth, SIM.capStrength);
const psi = new Float64Array(2 * grid.n);
let solver: SplitStep1D | null = null;
let config: TunnelConfig | null = null;
let t = 0;
let tEnd = 0;

self.onmessage = (e: MessageEvent<TunnelRequest>) => {
  const msg = e.data;
  if (msg.type === 'config') {
    config = msg.config;
    const V = rectBarrier(grid, 0, config.a, config.V0);
    solver = new SplitStep1D({ grid, dt: SIM.dt, potential: V, absorb });
    buildPacket1D(
      grid,
      { shape: 'gaussian', sigma: PACKET_SIGMA, x0: PACKET_X0, k0: config.k0, chirp: 0, separation: 0 },
      psi,
    );
    t = 0;
    // Until the slow tail of the packet (k₀ − 2σ_k) has crossed well past the barrier.
    const kSlow = Math.max(config.k0 - 2 / (2 * PACKET_SIGMA), 0.35);
    tEnd = (-PACKET_X0 + DISPLAY_HALF * 0.8) / kSlow;
    return;
  }
  if (!solver || !config) return;
  solver.step(psi, msg.steps);
  t += msg.steps * SIM.dt;
  const buf = msg.buf;
  for (let m = 0; m < DISPLAY_SAMPLES; m++) {
    const x = -DISPLAY_HALF + (2 * DISPLAY_HALF * m) / (DISPLAY_SAMPLES - 1);
    const i = Math.round((x - grid.x0) / grid.dx);
    buf[2 * m] = psi[2 * i];
    buf[2 * m + 1] = psi[2 * i + 1];
  }
  const reply: TunnelTick = {
    type: 'tick',
    buf,
    t,
    T: probabilityIn(psi, grid, config.a / 2, Infinity),
    R: probabilityIn(psi, grid, -Infinity, -config.a / 2),
    done: t >= tEnd,
  };
  self.postMessage(reply, [buf.buffer]);
};
