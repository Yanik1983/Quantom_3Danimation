import { Vector3 } from 'three';
import { EXPERIMENTS, type ExperimentId } from '../state/lab';

/** Lab layout (world units). Table tops sit at y = 0; the floor is at FLOOR_Y. */
export const FLOOR_Y = -1;
export const TABLE_RADIUS = 2.5;

export interface TablePose {
  position: readonly [number, number, number];
  /** Rotation about +y so the table's front (+z) faces the overview camera. */
  yaw: number;
  /** Close-up camera, in the table's local frame. */
  camera: readonly [number, number, number];
  look: readonly [number, number, number];
}

export const OVERVIEW = {
  camera: [0, 7.6, 16.2] as const,
  look: [0, 0.5, -2.2] as const,
};

const FACING = new Vector3(0, 0, 14);

function table(
  x: number,
  z: number,
  camera: readonly [number, number, number],
  look: readonly [number, number, number],
): TablePose {
  return { position: [x, 0, z], yaw: Math.atan2(FACING.x - x, FACING.z - z), camera, look };
}

/** Four tables on a gentle arc, in the order the experiments are meant to be visited. */
export const TABLES: Record<ExperimentId, TablePose> = {
  basics: table(-7.9, -1.3, [0, 4.4, 6.9], [-0.2, 0.9, -0.3]),
  superposition: table(-2.65, -3.7, [0, 3.2, 6.6], [0, 0.8, 0]),
  qubits: table(2.65, -3.7, [0, 3.1, 7.0], [0, 1.2, 0]),
  entanglement: table(7.9, -1.3, [0, 2.9, 6.9], [0, 0.9, 0]),
};

if (Object.keys(TABLES).length !== EXPERIMENTS.length) throw new Error('One table per experiment');

const Y = new Vector3(0, 1, 0);
const base = new Vector3();

/** World-space close-up camera pose for an experiment (writes into the given vectors; no allocation). */
export function closeUpPose(id: ExperimentId, pos: Vector3, look: Vector3): void {
  const t = TABLES[id];
  base.set(...t.position);
  pos
    .set(...t.camera)
    .applyAxisAngle(Y, t.yaw)
    .add(base);
  look
    .set(...t.look)
    .applyAxisAngle(Y, t.yaw)
    .add(base);
}
