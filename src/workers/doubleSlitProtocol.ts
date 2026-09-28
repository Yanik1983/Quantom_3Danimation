export interface Region {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface DoubleSlitRequest {
  quality: 'low' | 'high';
  texW: number;
  texH: number;
  frameEvery: number;
  region: Region;
}

export type DoubleSlitResponse =
  | { type: 'progress'; value: number }
  | {
      type: 'done';
      /** Half-float RG volume texW × texH × frames of ψ₁ (scaled so the initial peak |ψ| = 1). */
      volume: Uint16Array;
      frames: number;
      coherent: Float64Array;
      upper: Float64Array;
      whichPath: Float64Array;
      grid: { ny: number; dy: number; y0: number };
      arrivalFraction: number;
      maskFraction: number;
      config: {
        nx: number;
        ny: number;
        dt: number;
        k0: number;
        maskX: number;
        screenX: number;
        slitSeparation: number;
      };
      millis: number;
    };
