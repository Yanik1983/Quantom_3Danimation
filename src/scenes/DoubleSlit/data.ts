import type { DoubleSlitRequest, DoubleSlitResponse } from '../../workers/doubleSlitProtocol';
import { REGION, TEX_H, TEX_W } from './geometry';
import { useDoubleSlit } from './store';

export type DoubleSlitData = Extract<DoubleSlitResponse, { type: 'done' }>;

/**
 * The simulation result is deterministic, so it is computed once per quality level and
 * cached for the session (the scene may unmount and remount as the viewer travels).
 */
const cache = new Map<string, Promise<DoubleSlitData>>();

export function loadDoubleSlit(quality: 'low' | 'high'): Promise<DoubleSlitData> {
  const hit = cache.get(quality);
  if (hit) return hit;
  const store = useDoubleSlit.getState;
  useDoubleSlit.setState({ status: 'computing', progress: 0 });
  const p = new Promise<DoubleSlitData>((resolve, reject) => {
    const worker = new Worker(new URL('../../workers/doubleSlit.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<DoubleSlitResponse>) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        if (store().status === 'computing') useDoubleSlit.setState({ progress: msg.value });
      } else {
        worker.terminate();
        useDoubleSlit.setState({ status: 'ready', progress: 1 });
        resolve(msg);
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      cache.delete(quality);
      useDoubleSlit.setState({ status: 'error' });
      reject(err);
    };
    const req: DoubleSlitRequest = {
      quality,
      texW: TEX_W,
      texH: TEX_H,
      frameEvery: quality === 'low' ? 5 : 6,
      region: REGION,
    };
    worker.postMessage(req);
  });
  cache.set(quality, p);
  return p;
}
