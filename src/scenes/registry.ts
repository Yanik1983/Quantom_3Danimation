import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { ExperimentId } from '../state/lab';

export interface SceneProps {
  /** True while this experiment is open; otherwise the model idles on its table in the lab. */
  active: boolean;
}

export interface SceneEntry {
  Scene: LazyExoticComponent<ComponentType<SceneProps>>;
  Controls: LazyExoticComponent<ComponentType>;
}

/** Experiment → lazily loaded 3D model (table-local coordinates, top at y = 0) and DOM controls. */
export const SCENES: Record<ExperimentId, SceneEntry> = {
  basics: {
    Scene: lazy(() => import('./DoubleSlit/Scene')),
    Controls: lazy(() => import('./DoubleSlit/Controls')),
  },
  qubits: {
    Scene: lazy(() => import('./Qubits/Scene')),
    Controls: lazy(() => import('./Qubits/Controls')),
  },
  entanglement: {
    Scene: lazy(() => import('./Entanglement/Scene')),
    Controls: lazy(() => import('./Entanglement/Controls')),
  },
  search: {
    Scene: lazy(() => import('./Search/Scene')),
    Controls: lazy(() => import('./Search/Controls')),
  },
};
