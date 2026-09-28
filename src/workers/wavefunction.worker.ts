/// <reference lib="webworker" />
/**
 * Live 2D Schrödinger evolution for the wavefunction scene. ψ stays in the worker; each
 * tick fills a half-float display buffer that ping-pongs with the main thread.
 */
import { centeredGrid2D, type Grid2D } from '../physics/grid';
import { SplitStep2D } from '../physics/splitStep2d';
import {
  emptyObservables,
  harmonicPotential2D,
  Observables2D,
  superposePackets,
} from '../physics/wavepacket2d';
import { toHalf } from '../lib/half';
import type { PotentialKind, WavefunctionRequest, WavefunctionTick } from './wavefunctionProtocol';

declare const self: DedicatedWorkerGlobalScope;

let grid: Grid2D;
let psi: Float64Array;
let solvers: Record<PotentialKind, SplitStep2D>;
let potentials: Record<PotentialKind, Float64Array | null>;
let observables: Observables2D;
const obs = emptyObservables();
let t = 0;

self.onmessage = (e: MessageEvent<WavefunctionRequest>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    grid = centeredGrid2D(msg.n, msg.n, msg.size, msg.size);
    psi = new Float64Array(2 * msg.n * msg.n);
    const bowl = harmonicPotential2D(grid, msg.omega);
    potentials = { harmonic: bowl, free: null };
    solvers = {
      harmonic: new SplitStep2D({ grid, dt: msg.dt, potential: bowl }),
      free: new SplitStep2D({ grid, dt: msg.dt }),
    };
    observables = new Observables2D(grid);
    return;
  }
  if (msg.packets) {
    superposePackets(grid, msg.packets, psi);
    t = 0;
  }
  if (msg.steps > 0) {
    solvers[msg.potential].step(psi, msg.steps);
    t += msg.steps * solvers[msg.potential].dt;
  }
  const tex = msg.tex;
  for (let i = 0; i < psi.length; i++) tex[i] = toHalf(psi[i]);
  const reply: WavefunctionTick = {
    type: 'tick',
    tex,
    t,
    obs: msg.measure ? { ...observables.measure(psi, potentials[msg.potential], obs) } : null,
  };
  self.postMessage(reply, [tex.buffer]);
};
