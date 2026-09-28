import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { easing } from 'maath';
import { FLIGHT_MID, FLIGHT_START, useNav } from '../state/nav';
import { selectReducedMotion, useSettings } from '../state/settings';
import { STATIONS } from './stations';
import { rig } from './rig';

// Pre-allocated scratch vectors: the rig runs every frame and must not allocate.
const targetPos = new Vector3();
const targetLook = new Vector3();
const nextPos = new Vector3();
const nextLook = new Vector3();
const prevPos = new Vector3();

/**
 * Camera distance multiplier: stations are framed for landscape screens; in portrait the
 * horizontal field of view shrinks, so the camera backs off to keep each scene in frame.
 */
let distanceScale = 1;

function stationPose(i: number, pos: Vector3, look: Vector3): void {
  const s = STATIONS[i];
  look.set(s.center[0] + s.look[0], s.center[1] + s.look[1], s.center[2] + s.look[2]);
  pos.set(
    look.x + (s.camera[0] - s.look[0]) * distanceScale,
    look.y + (s.camera[1] - s.look[1]) * distanceScale,
    look.z + (s.camera[2] - s.look[2]) * distanceScale,
  );
}

/**
 * Shifts the projection so the scene is framed in the part of the screen not covered
 * by the text card (right side on wide screens, top half on phones).
 */
function useFramingOffset(): void {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const { width, height } = useThree((s) => s.size);
  useLayoutEffect(() => {
    let dx = 0;
    let dy = 0;
    if (width >= 1024) dx = Math.min(300, width * 0.2);
    else if (width >= 700) dx = width * 0.2;
    else dy = height * 0.2;
    const aspect = width / height;
    distanceScale = aspect < 1 ? Math.min(2.1, 0.9 / aspect) : aspect < 1.25 ? 1.15 : 1;
    camera.setViewOffset(width, height, -dx, dy, width, height);
    camera.updateProjectionMatrix();
  }, [camera, width, height]);
}

export function CameraRig() {
  const initialized = useRef(false);
  useFramingOffset();

  useFrame((state, dt) => {
    const { camera } = state;
    const p = useNav.getState().p;
    const reduced = selectReducedMotion(useSettings.getState());
    const last = STATIONS.length - 1;
    const i = Math.min(Math.floor(p), last);
    const f = p - i;

    let t = 0;
    if (i < last) {
      // Reduced motion: no flight — cut to the next station halfway through the gap.
      t = reduced ? (f >= FLIGHT_MID ? 1 : 0) : MathUtils.smootherstep(f, FLIGHT_START, 1);
    }

    stationPose(i, targetPos, targetLook);
    if (t > 0) {
      stationPose(i + 1, nextPos, nextLook);
      targetPos.lerp(nextPos, t);
      targetLook.lerp(nextLook, t);
      // Arc outward mid-flight so the previous scene recedes rather than sliding sideways.
      const arc = Math.sin(Math.PI * t);
      targetPos.y += arc * 5;
      targetPos.z += arc * 14;
    }

    if (!initialized.current || reduced) {
      camera.position.copy(targetPos);
      rig.look.copy(targetLook);
      initialized.current = true;
    } else {
      const d = Math.min(dt, 0.1);
      easing.damp3(camera.position, targetPos, 0.35, d);
      easing.damp3(rig.look, targetLook, 0.3, d);
    }
    camera.lookAt(rig.look);

    rig.speed = dt > 0 ? prevPos.distanceTo(camera.position) / dt : 0;
    prevPos.copy(camera.position);
  });

  return null;
}
