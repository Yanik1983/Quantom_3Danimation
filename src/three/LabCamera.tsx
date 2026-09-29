import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import { easing } from 'maath';
import { useLab } from '../state/lab';
import { UI } from '../content/i18n';
import { selectReducedMotion, useSettings } from '../state/settings';
import { rig } from './rig';
import { closeUpPose, OVERVIEW } from './tables';

// Pre-allocated scratch: the rig runs every frame and must not allocate.
const targetPos = new Vector3();
const targetLook = new Vector3();
const prevPos = new Vector3();
const offset = { x: 0, y: 0 };

/**
 * Where the scene should sit on screen, as a view offset in pixels: with an experiment open
 * the card covers the left side (right side in Hebrew) on wide screens or the bottom on phones,
 * so the picture shifts into the free area. Also returns how far to back off in portrait, where
 * the horizontal field of view is narrow.
 */
function framing(width: number, height: number, open: boolean, rtl: boolean) {
  const aspect = width / height;
  let dx = 0;
  let dy = 0;
  if (open) {
    if (width >= 1024) dx = Math.min(260, width * 0.19);
    else if (width >= 700) dx = width * 0.2;
    else dy = height * 0.22;
  }
  const distance =
    aspect < 1 ? Math.min(open ? 2.2 : 3.2, (open ? 0.85 : 1.45) / aspect) : aspect < 1.3 ? 1.15 : 1;
  return { dx: rtl ? -dx : dx, dy, distance };
}

/** Glides between the lab overview and each experiment's close-up (a cut under reduced motion). */
export function LabCamera() {
  const initialized = useRef(false);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;

  useFrame((state, dt) => {
    const { width, height } = state.size;
    const current = useLab.getState().current;
    const settings = useSettings.getState();
    const reduced = selectReducedMotion(settings);
    const f = framing(width, height, current !== null, UI[settings.lang].dir === 'rtl');

    if (current) closeUpPose(current, targetPos, targetLook);
    else {
      targetPos.set(...OVERVIEW.camera);
      targetLook.set(...OVERVIEW.look);
    }
    // Back off along the view direction on narrow screens.
    targetPos.sub(targetLook).multiplyScalar(f.distance).add(targetLook);

    const snap = !initialized.current || reduced;
    const d = Math.min(dt, 0.1);
    if (snap) {
      camera.position.copy(targetPos);
      rig.look.copy(targetLook);
      offset.x = f.dx;
      offset.y = f.dy;
      initialized.current = true;
    } else {
      easing.damp3(camera.position, targetPos, 0.45, d);
      easing.damp3(rig.look, targetLook, 0.4, d);
      offset.x += (f.dx - offset.x) * Math.min(1, d * 5);
      offset.y += (f.dy - offset.y) * Math.min(1, d * 5);
    }
    camera.lookAt(rig.look);
    camera.setViewOffset(width, height, -offset.x, offset.y, width, height);
    camera.updateProjectionMatrix();

    rig.speed = dt > 0 ? prevPos.distanceTo(camera.position) / dt : 0;
    prevPos.copy(camera.position);
  });

  return null;
}
