import { Vector3 } from 'three';

/** Shared, mutable camera-rig state read by post-processing each frame (no React state). */
export const rig = {
  look: new Vector3(),
  /** Camera speed in world units / s, used to drive focus-transition depth of field. */
  speed: 0,
};
