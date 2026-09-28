import { mulberry32 } from '../physics/rng';

/** Measurement outcomes must be unpredictable: seeded once from the browser's entropy source. */
export const liveRng = mulberry32(crypto.getRandomValues(new Uint32Array(1))[0]);
