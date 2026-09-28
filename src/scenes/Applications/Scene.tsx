import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { selectReducedMotion, useSettings } from '../../state/settings';
import type { SceneProps } from '../registry';
import { Laser } from './Laser';
import { Mri } from './Mri';
import { QuantumComputer } from './QuantumComputer';
import { useApplications } from './store';
import { Transistor } from './Transistor';

/** Shows the selected application; switching scales the new vignette in. */
export default function ApplicationsScene(_props: SceneProps) {
  const app = useApplications((s) => s.app);
  const group = useRef<Group>(null);
  const grow = useRef({ app, t: 1 });

  useFrame((_, dt) => {
    const g = grow.current;
    if (g.app !== useApplications.getState().app) {
      g.app = useApplications.getState().app;
      g.t = 0;
    }
    const reduced = selectReducedMotion(useSettings.getState());
    g.t = reduced ? 1 : Math.min(1, g.t + dt / 0.5);
    const e = 1 - Math.pow(1 - g.t, 3);
    group.current?.scale.setScalar(0.6 + 0.4 * e);
  });

  return (
    <group ref={group}>
      {app === 'transistor' && <Transistor />}
      {app === 'mri' && <Mri />}
      {app === 'laser' && <Laser />}
      {app === 'qc' && <QuantumComputer />}
    </group>
  );
}
