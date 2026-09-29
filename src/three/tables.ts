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
  camera: [0, 8.6, 19.6] as const,
  look: [0, 0.3, -2.4] as const,
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

/** Four tables on a gentle arc, in the order the steps are meant to be visited. */
export const TABLES: Record<ExperimentId, TablePose> = {
  basics: table(-9, -0.4, [0, 4.4, 6.9], [0, 0.9, -0.3]),
  qubits: table(-3.1, -3.7, [0, 3.6, 7.2], [0, 1.1, 0]),
  entanglement: table(3.1, -3.7, [0, 2.9, 6.9], [0, 0.9, 0]),
  search: table(9, -0.4, [0.3, 3.6, 7.2], [0.3, 1.1, 0]),
};

/** Close-up of the open dilution refrigerator (world coordinates). */
export const COMPUTER_POSE = {
  camera: [-7.4, 4.7, -5.2] as const,
  look: [-12, 3.9, -12.5] as const,
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
