import { STATION_COUNT } from '../content/sections';

export interface Station {
  /** World-space centre of the station's scene. */
  center: readonly [number, number, number];
  /** Camera position relative to centre. */
  camera: readonly [number, number, number];
  /** Look-at point relative to centre. */
  look: readonly [number, number, number];
}

const DEFAULT_CAM = [0, 1.2, 13] as const;
const ORIGIN = [0, 0, 0] as const;

/**
 * Stations are strung along a gentle arc through the starfield so that travelling
 * between concepts is a real flight through a continuous space.
 */
export const STATIONS: readonly Station[] = [
  { center: [0, 0, 0], camera: [0, 0.4, 14], look: ORIGIN },
  { center: [70, 6, -30], camera: [0, 7.6, 11.6], look: [0, 0.4, -1.4] }, // double slit
  { center: [140, -4, -10], camera: [0, 4.4, 10.8], look: [0, -1.1, -0.2] }, // wavefunction
  { center: [205, 10, -55], camera: DEFAULT_CAM, look: ORIGIN }, // superposition
  { center: [275, 0, -25], camera: [0, 1.5, 15], look: ORIGIN }, // orbitals
  { center: [345, -10, -65], camera: [0, 2.5, 14], look: ORIGIN }, // uncertainty
  { center: [415, 4, -40], camera: [0, 3, 14], look: [0, 0.5, 0] }, // tunneling
  { center: [485, -6, -80], camera: [0, 2, 15], look: ORIGIN }, // entanglement
  { center: [555, 8, -50], camera: [0, 1.8, 15], look: ORIGIN }, // applications
];

if (STATIONS.length !== STATION_COUNT) {
  throw new Error('STATIONS must have one entry per section plus the intro');
}
