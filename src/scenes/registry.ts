import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface SceneProps {
  /** True while this is the station the viewer is at; neighbours are mounted but idle. */
  active: boolean;
}

export interface SceneEntry {
  Scene: LazyExoticComponent<ComponentType<SceneProps>>;
  Controls: LazyExoticComponent<ComponentType>;
}

/** Section id → lazily loaded 3D scene and DOM controls. */
export const SCENES: Partial<Record<string, SceneEntry>> = {
  'double-slit': {
    Scene: lazy(() => import('./DoubleSlit/Scene')),
    Controls: lazy(() => import('./DoubleSlit/Controls')),
  },
  wavefunction: {
    Scene: lazy(() => import('./Wavefunction/Scene')),
    Controls: lazy(() => import('./Wavefunction/Controls')),
  },
  superposition: {
    Scene: lazy(() => import('./Superposition/Scene')),
    Controls: lazy(() => import('./Superposition/Controls')),
  },
  orbitals: {
    Scene: lazy(() => import('./Orbitals/Scene')),
    Controls: lazy(() => import('./Orbitals/Controls')),
  },
  uncertainty: {
    Scene: lazy(() => import('./Uncertainty/Scene')),
    Controls: lazy(() => import('./Uncertainty/Controls')),
  },
};
