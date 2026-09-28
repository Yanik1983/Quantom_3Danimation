import type { Observables, Packet2D } from '../physics/wavepacket2d';

export type PotentialKind = 'harmonic' | 'free';

export type WavefunctionRequest =
  | { type: 'init'; n: number; size: number; dt: number; omega: number }
  | {
      type: 'tick';
      /** Display buffer to fill with half-float (Re ψ, Im ψ); transferred and returned. */
      tex: Uint16Array;
      steps: number;
      /** When present, rebuild ψ from these packets (and reset t = 0) before stepping. */
      packets?: Packet2D[];
      potential: PotentialKind;
      measure: boolean;
    };

export interface WavefunctionTick {
  type: 'tick';
  tex: Uint16Array;
  t: number;
  obs: Observables | null;
}
