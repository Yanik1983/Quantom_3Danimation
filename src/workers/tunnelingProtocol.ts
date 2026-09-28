export interface TunnelConfig {
  k0: number;
  V0: number;
  a: number;
}

export type TunnelRequest =
  | { type: 'config'; config: TunnelConfig }
  | {
      type: 'tick';
      /** Display buffer: interleaved ψ on the display window; transferred and returned. */
      buf: Float64Array;
      steps: number;
    };

export interface TunnelTick {
  type: 'tick';
  buf: Float64Array;
  t: number;
  /** Probability beyond the barrier (x > a/2) and before it (x < −a/2). */
  T: number;
  R: number;
  /** The scattering is over: both parts have left the barrier region for good. */
  done: boolean;
}
