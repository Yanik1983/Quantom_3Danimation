/// <reference lib="webworker" />
/**
 * Runs the double-slit TDSE simulation off the main thread and packs ψ₁ snapshots into
 * a half-float RG volume (x, y, time) for the GPU.
 */
import { toHalf } from '../lib/half';
import { DEFAULT_DOUBLE_SLIT, LOW_DOUBLE_SLIT, runDoubleSlit } from '../physics/doubleSlit';
import type { DoubleSlitRequest, DoubleSlitResponse } from './doubleSlitProtocol';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (e: MessageEvent<DoubleSlitRequest>) => {
  const { quality, texW, texH, frameEvery, region } = e.data;
  const cfg = quality === 'low' ? LOW_DOUBLE_SLIT : DEFAULT_DOUBLE_SLIT;
  const t0 = performance.now();

  const frames: Uint16Array[] = [];
  let scale = 0;
  const post = (msg: DoubleSlitResponse, transfer: Transferable[] = []) => self.postMessage(msg, transfer);

  const result = runDoubleSlit(
    cfg,
    {
      every: frameEvery,
      capture(psi) {
        const { nx, ny, dx, dy, x0, y0 } = gridOf(cfg);
        if (scale === 0) {
          let max = 0;
          for (let i = 0; i < psi.length; i += 2)
            max = Math.max(max, psi[i] * psi[i] + psi[i + 1] * psi[i + 1]);
          scale = 1 / Math.sqrt(max);
        }
        const out = new Uint16Array(texW * texH * 2);
        for (let j = 0; j < texH; j++) {
          const y = region.y0 + ((j + 0.5) / texH) * (region.y1 - region.y0);
          const gy = (y - y0) / dy;
          const j0 = Math.max(0, Math.min(ny - 2, Math.floor(gy)));
          const fy = gy - j0;
          for (let i = 0; i < texW; i++) {
            const x = region.x0 + ((i + 0.5) / texW) * (region.x1 - region.x0);
            const gx = (x - x0) / dx;
            const i0 = Math.max(0, Math.min(nx - 2, Math.floor(gx)));
            const fx = gx - i0;
            const a = 2 * (j0 * nx + i0);
            const b = a + 2;
            const c = a + 2 * nx;
            const d = c + 2;
            const w00 = (1 - fx) * (1 - fy);
            const w10 = fx * (1 - fy);
            const w01 = (1 - fx) * fy;
            const w11 = fx * fy;
            const re = w00 * psi[a] + w10 * psi[b] + w01 * psi[c] + w11 * psi[d];
            const im = w00 * psi[a + 1] + w10 * psi[b + 1] + w01 * psi[c + 1] + w11 * psi[d + 1];
            const o = 2 * (j * texW + i);
            out[o] = toHalf(re * scale);
            out[o + 1] = toHalf(im * scale);
          }
        }
        frames.push(out);
      },
    },
    (f) => post({ type: 'progress', value: f }),
  );

  const volume = new Uint16Array(texW * texH * 2 * frames.length);
  frames.forEach((f, k) => volume.set(f, k * f.length));
  const msg: DoubleSlitResponse = {
    type: 'done',
    volume,
    frames: frames.length,
    coherent: result.coherent,
    upper: result.upper,
    whichPath: result.whichPath,
    grid: { ny: result.grid.ny, dy: result.grid.dy, y0: result.grid.y0 },
    arrivalFraction: result.arrivalFraction,
    maskFraction: result.maskFraction,
    config: {
      nx: cfg.nx,
      ny: cfg.ny,
      dt: cfg.dt,
      k0: cfg.k0,
      maskX: cfg.maskX,
      screenX: cfg.screenX,
      slitSeparation: cfg.slitSeparation,
    },
    millis: performance.now() - t0,
  };
  post(msg, [volume.buffer, result.coherent.buffer, result.upper.buffer, result.whichPath.buffer]);
};

function gridOf(cfg: typeof DEFAULT_DOUBLE_SLIT) {
  return {
    nx: cfg.nx,
    ny: cfg.ny,
    dx: cfg.lx / cfg.nx,
    dy: cfg.ly / cfg.ny,
    x0: -cfg.lx / 2,
    y0: -cfg.ly / 2,
  };
}
